package com.acme.featureflags.persistence

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import java.sql.Connection

data class DatabaseConfig(
    val jdbcUrl: String = env("DB_URL", "jdbc:h2:file:./data/feature-flags;MODE=PostgreSQL;DB_CLOSE_DELAY=-1"),
    val username: String = env("DB_USER", "sa"),
    val password: String = env("DB_PASSWORD", ""),
    val maximumPoolSize: Int = env("DB_POOL_SIZE", "10").toIntOrNull() ?: 10,
)

class Database(config: DatabaseConfig = DatabaseConfig()) : AutoCloseable {
    private val dataSource = HikariDataSource(HikariConfig().apply {
        jdbcUrl = config.jdbcUrl
        username = config.username
        password = config.password
        maximumPoolSize = config.maximumPoolSize
        minimumIdle = 1
        poolName = "feature-flag-pool"
        connectionTimeout = 5_000
    })

    fun <T> withConnection(block: (Connection) -> T): T = dataSource.connection.use(block)

    fun initialize() {
        withConnection { connection ->
            connection.createStatement().use { statement ->
                statement.executeUpdate(
                    """
                    CREATE TABLE IF NOT EXISTS feature_flags (
                        id VARCHAR(100) PRIMARY KEY,
                        flag_key VARCHAR(120) NOT NULL UNIQUE,
                        name VARCHAR(160) NOT NULL,
                        description VARCHAR(500) NOT NULL,
                        type VARCHAR(32) NOT NULL,
                        enabled BOOLEAN NOT NULL,
                        updated_at TIMESTAMP NOT NULL,
                        updated_by VARCHAR(120) NOT NULL
                    )
                    """.trimIndent(),
                )
            }
        }
    }

    override fun close() = dataSource.close()
}

private fun env(name: String, fallback: String): String = System.getenv(name)?.takeIf { it.isNotBlank() } ?: fallback

