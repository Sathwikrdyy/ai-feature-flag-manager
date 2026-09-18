package com.acme.featureflags

import com.acme.featureflags.domain.ApiError
import com.acme.featureflags.domain.CreateFeatureFlagRequest
import com.acme.featureflags.domain.ErrorResponse
import com.acme.featureflags.domain.FlagNotFoundException
import com.acme.featureflags.domain.HealthResponse
import com.acme.featureflags.domain.DuplicateFlagException
import com.acme.featureflags.domain.UpdateFeatureFlagRequest
import com.acme.featureflags.domain.ValidationException
import com.acme.featureflags.domain.normalized
import com.acme.featureflags.domain.validate
import com.acme.featureflags.persistence.Database
import com.acme.featureflags.persistence.JdbcFeatureFlagRepository
import com.acme.featureflags.persistence.FeatureFlagRepository
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.JsonConvertException
import io.ktor.server.application.Application
import io.ktor.server.application.ApplicationCallPipeline
import io.ktor.server.application.call
import io.ktor.server.application.install
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import io.ktor.server.plugins.BadRequestException
import io.ktor.server.plugins.ContentTransformationException
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.get
import io.ktor.server.routing.patch
import io.ktor.server.routing.post
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json
import java.util.UUID
import io.ktor.util.AttributeKey

private val requestIdKey = AttributeKey<String>("request-id")

fun main() {
    val port = System.getenv("PORT")?.toIntOrNull() ?: 8080
    embeddedServer(Netty, port = port, host = "0.0.0.0", module = Application::module).start(wait = true)
}

fun Application.module(
    database: Database = Database(),
    repository: FeatureFlagRepository = JdbcFeatureFlagRepository(database),
) {
    database.initialize()
    repository.seedIfEmpty()

    intercept(ApplicationCallPipeline.Setup) {
        val requestId = call.request.headers["X-Request-ID"]?.takeIf { it.length <= 100 } ?: "req-${UUID.randomUUID()}"
        call.attributes.put(requestIdKey, requestId)
        call.response.headers.append("X-Request-ID", requestId)
    }

    install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = false; explicitNulls = false })
    }
    install(CORS) {
        allowHost("localhost:5173")
        allowHost("127.0.0.1:5173")
        allowMethod(HttpMethod.Get)
        allowMethod(HttpMethod.Post)
        allowMethod(HttpMethod.Patch)
        allowHeader(HttpHeaders.ContentType)
        allowHeader("X-Request-ID")
    }
    install(StatusPages) {
        exception<ValidationException> { call, cause -> call.respondError(HttpStatusCode.BadRequest, "VALIDATION_ERROR", cause.message ?: "Invalid request", cause.fields) }
        exception<DuplicateFlagException> { call, cause -> call.respondError(HttpStatusCode.Conflict, "DUPLICATE_FLAG", cause.message ?: "Duplicate flag") }
        exception<FlagNotFoundException> { call, cause -> call.respondError(HttpStatusCode.NotFound, "FLAG_NOT_FOUND", cause.message ?: "Flag not found") }
        exception<ContentTransformationException> { call, cause -> call.respondError(HttpStatusCode.BadRequest, "INVALID_JSON", "Request body is invalid JSON") }
        exception<BadRequestException> { call, cause -> call.respondError(HttpStatusCode.BadRequest, "BAD_REQUEST", cause.message ?: "Bad request") }
        exception<JsonConvertException> { call, cause -> call.respondError(HttpStatusCode.BadRequest, "INVALID_JSON", cause.message ?: "Request body is invalid JSON") }
        exception<Throwable> { call, cause ->
            call.application.environment.log.error("Unhandled request failure [${call.requestId()}]", cause)
            call.respondError(HttpStatusCode.InternalServerError, "INTERNAL_ERROR", "Something went wrong. Try again later.")
        }
    }

    routing {
        get("/health") { call.respond(HealthResponse("ok")) }
        route("/api/v1/flags") {
            get { call.respond(repository.list()) }
            post {
                val request = call.receive<CreateFeatureFlagRequest>().normalized()
                request.validate()
                call.respond(HttpStatusCode.Created, repository.create(request))
            }
            patch("/{id}") {
                val id = call.parameters["id"]?.takeIf { it.isNotBlank() } ?: throw BadRequestException("Flag id is required")
                val request = call.receive<UpdateFeatureFlagRequest>()
                val enabled = request.enabled ?: throw ValidationException(mapOf("enabled" to "Enabled must be true or false."))
                call.respond(repository.setEnabled(id, enabled))
            }
        }
    }
}

private fun io.ktor.server.application.ApplicationCall.requestId(): String = attributes.getOrNull(requestIdKey) ?: "unknown"

private suspend fun io.ktor.server.application.ApplicationCall.respondError(
    status: HttpStatusCode,
    code: String,
    message: String,
    details: Map<String, String> = emptyMap(),
) {
    respond(status, ErrorResponse(ApiError(code, message, requestId(), details)))
}
