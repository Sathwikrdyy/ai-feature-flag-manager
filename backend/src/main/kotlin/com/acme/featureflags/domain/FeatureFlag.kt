package com.acme.featureflags.domain

import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName

@Serializable
enum class FlagType {
    @SerialName("release")
    RELEASE,
    @SerialName("experiment")
    EXPERIMENT,
}

@Serializable
data class FeatureFlag(
    val id: String,
    val key: String,
    val name: String,
    val description: String,
    val type: FlagType,
    val enabled: Boolean,
    val updatedAt: String,
    val updatedBy: String,
)

@Serializable
data class CreateFeatureFlagRequest(
    val key: String,
    val name: String,
    val description: String,
    val type: FlagType,
    val enabled: Boolean = false,
)

@Serializable
data class UpdateFeatureFlagRequest(
    val enabled: Boolean? = null,
)

@Serializable
data class HealthResponse(
    val status: String,
)

@Serializable
data class ErrorResponse(
    val error: ApiError,
)

@Serializable
data class ApiError(
    val code: String,
    val message: String,
    val requestId: String,
    val details: Map<String, String> = emptyMap(),
)
