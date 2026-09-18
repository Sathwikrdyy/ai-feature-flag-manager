package com.acme.featureflags

import com.acme.featureflags.domain.FeatureFlag
import com.acme.featureflags.persistence.Database
import com.acme.featureflags.persistence.JdbcFeatureFlagRepository
import io.ktor.client.call.body
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.request.get
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.server.testing.testApplication
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ApiTest {
    @Test
    fun `health and flag lifecycle work`() = testApplication {
        val database = Database(DatabaseConfigForTest.config())
        application { module(database = database, repository = JdbcFeatureFlagRepository(database)) }

        client.get("/health").apply {
            assertEquals(HttpStatusCode.OK, status)
            assertTrue(body<String>().contains("ok"))
        }
        assertEquals(HttpStatusCode.OK, client.get("/api/v1/flags").status)
        val create = client.post("/api/v1/flags") {
            contentType(ContentType.Application.Json)
            setBody("""{"key":"ai_test","name":"AI Test","description":"A test flag.","type":"release","enabled":false}""")
        }
        assertEquals(HttpStatusCode.Created, create.status)
        val created = Json.decodeFromString<FeatureFlag>(create.body())
        val duplicate = client.post("/api/v1/flags") {
            contentType(ContentType.Application.Json)
            setBody("""{"key":"ai_test","name":"Duplicate","description":"A duplicate flag.","type":"release","enabled":false}""")
        }
        assertEquals(HttpStatusCode.Conflict, duplicate.status)
        val update = client.patch("/api/v1/flags/${created.id}") {
            contentType(ContentType.Application.Json)
            setBody("""{"enabled":true}""")
        }
        assertEquals(HttpStatusCode.OK, update.status)
        assertTrue(Json.decodeFromString<FeatureFlag>(update.body()).enabled)
        val missing = client.patch("/api/v1/flags/missing-id") {
            contentType(ContentType.Application.Json)
            setBody("""{"enabled":true}""")
        }
        assertEquals(HttpStatusCode.NotFound, missing.status)
        database.close()
    }
}

private object DatabaseConfigForTest {
    fun config() = com.acme.featureflags.persistence.DatabaseConfig("jdbc:h2:mem:test-${System.nanoTime()};DB_CLOSE_DELAY=-1")
}
