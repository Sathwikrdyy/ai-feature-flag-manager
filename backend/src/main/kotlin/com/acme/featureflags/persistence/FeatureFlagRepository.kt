package com.acme.featureflags.persistence

import com.acme.featureflags.domain.CreateFeatureFlagRequest
import com.acme.featureflags.domain.DuplicateFlagException
import com.acme.featureflags.domain.FeatureFlag
import com.acme.featureflags.domain.FlagNotFoundException
import java.sql.ResultSet
import java.sql.SQLException
import java.sql.Timestamp
import java.time.Instant
import java.util.UUID

interface FeatureFlagRepository {
    fun list(): List<FeatureFlag>
    fun create(request: CreateFeatureFlagRequest): FeatureFlag
    fun setEnabled(id: String, enabled: Boolean): FeatureFlag
    fun seedIfEmpty()
}

class JdbcFeatureFlagRepository(
    private val database: Database,
    private val now: () -> Instant = { Instant.now() },
) : FeatureFlagRepository {

    override fun list(): List<FeatureFlag> = database.withConnection { connection ->
        connection.prepareStatement(
            "SELECT id, flag_key, name, description, type, enabled, updated_at, updated_by FROM feature_flags ORDER BY updated_at DESC",
        ).use { statement ->
            statement.executeQuery().use { result ->
                buildList { while (result.next()) add(result.toFeatureFlag()) }
            }
        }
    }

    override fun create(request: CreateFeatureFlagRequest): FeatureFlag {
        val flag = FeatureFlag(
            id = "flag-${UUID.randomUUID()}",
            key = request.key,
            name = request.name,
            description = request.description,
            type = request.type,
            enabled = request.enabled,
            updatedAt = now().toString(),
            updatedBy = "You",
        )
        try {
            database.withConnection { connection ->
                connection.prepareStatement(
                    "INSERT INTO feature_flags (id, flag_key, name, description, type, enabled, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                ).use { statement ->
                    statement.setString(1, flag.id)
                    statement.setString(2, flag.key)
                    statement.setString(3, flag.name)
                    statement.setString(4, flag.description)
                    statement.setString(5, flag.type.name.lowercase())
                    statement.setBoolean(6, flag.enabled)
                    statement.setTimestamp(7, Timestamp.from(Instant.parse(flag.updatedAt)))
                    statement.setString(8, flag.updatedBy)
                    statement.executeUpdate()
                }
            }
        } catch (error: SQLException) {
            if (error.message.orEmpty().contains("unique", ignoreCase = true) || error.message.orEmpty().contains("constraint", ignoreCase = true)) {
                throw DuplicateFlagException()
            }
            throw error
        }
        return flag
    }

    override fun setEnabled(id: String, enabled: Boolean): FeatureFlag {
        val updatedAt = now()
        database.withConnection { connection ->
            connection.prepareStatement("UPDATE feature_flags SET enabled = ?, updated_at = ?, updated_by = ? WHERE id = ?").use { statement ->
                statement.setBoolean(1, enabled)
                statement.setTimestamp(2, Timestamp.from(updatedAt))
                statement.setString(3, "You")
                statement.setString(4, id)
                if (statement.executeUpdate() == 0) throw FlagNotFoundException()
            }
        }
        return findById(id) ?: throw FlagNotFoundException()
    }

    override fun seedIfEmpty() {
        if (list().isNotEmpty()) return
        seedFlags.forEach { create(it) }
    }

    private fun findById(id: String): FeatureFlag? = database.withConnection { connection ->
        connection.prepareStatement("SELECT id, flag_key, name, description, type, enabled, updated_at, updated_by FROM feature_flags WHERE id = ?").use { statement ->
            statement.setString(1, id)
            statement.executeQuery().use { result -> if (result.next()) result.toFeatureFlag() else null }
        }
    }

    private fun ResultSet.toFeatureFlag() = FeatureFlag(
        id = getString("id"),
        key = getString("flag_key"),
        name = getString("name"),
        description = getString("description"),
        type = when (getString("type").uppercase()) {
            "EXPERIMENT" -> com.acme.featureflags.domain.FlagType.EXPERIMENT
            else -> com.acme.featureflags.domain.FlagType.RELEASE
        },
        enabled = getBoolean("enabled"),
        updatedAt = getTimestamp("updated_at").toInstant().toString(),
        updatedBy = getString("updated_by"),
    )
}

private val seedFlags = listOf(
    CreateFeatureFlagRequest("ai_smart_replies", "AI Smart Replies", "Suggests concise responses based on conversation context.", com.acme.featureflags.domain.FlagType.RELEASE, true),
    CreateFeatureFlagRequest("ai_conversation_summary", "Conversation Summary", "Generates a short summary when a support conversation closes.", com.acme.featureflags.domain.FlagType.RELEASE, true),
    CreateFeatureFlagRequest("ai_tone_rewrite", "Tone Rewrite", "Lets users adjust the tone of generated copy before sending.", com.acme.featureflags.domain.FlagType.EXPERIMENT, false),
    CreateFeatureFlagRequest("ai_docs_search", "AI Docs Search", "Answers questions using indexed internal documentation.", com.acme.featureflags.domain.FlagType.RELEASE, true),
    CreateFeatureFlagRequest("ai_auto_tagging", "Automatic Tagging", "Classifies incoming requests with suggested issue tags.", com.acme.featureflags.domain.FlagType.EXPERIMENT, false),
    CreateFeatureFlagRequest("ai_voice_transcription", "Voice Transcription", "Transcribes voice notes into editable text.", com.acme.featureflags.domain.FlagType.EXPERIMENT, false),
)
