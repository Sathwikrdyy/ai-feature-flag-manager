package com.acme.featureflags.domain

private val keyPattern = Regex("^[a-z][a-z0-9_]*$")

class ValidationException(
    val fields: Map<String, String>,
) : RuntimeException("Request validation failed")

class DuplicateFlagException : RuntimeException("A flag with this key already exists")

class FlagNotFoundException : RuntimeException("Feature flag was not found")

fun CreateFeatureFlagRequest.validate() {
    val errors = linkedMapOf<String, String>()
    val normalizedKey = key.trim()
    val normalizedName = name.trim()
    val normalizedDescription = description.trim()

    if (normalizedKey.isEmpty()) errors["key"] = "Add a key for this flag."
    else if (!keyPattern.matches(normalizedKey)) errors["key"] = "Use lowercase letters, numbers, and underscores."
    if (normalizedName.isEmpty()) errors["name"] = "Add a name for this flag."
    else if (normalizedName.length > 160) errors["name"] = "Name must be 160 characters or fewer."
    if (normalizedDescription.isEmpty()) errors["description"] = "Add a short description."
    else if (normalizedDescription.length > 500) errors["description"] = "Description must be 500 characters or fewer."

    if (errors.isNotEmpty()) throw ValidationException(errors)
}

fun CreateFeatureFlagRequest.normalized() = copy(
    key = key.trim(),
    name = name.trim(),
    description = description.trim(),
)
