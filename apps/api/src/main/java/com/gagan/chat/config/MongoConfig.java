

package com.gagan.chat.config;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.AbstractMongoClientConfiguration;

@Configuration
public class MongoConfig extends AbstractMongoClientConfiguration {

    // No localhost fallback on purpose: if MONGODB_URI is missing/misnamed,
    // the app should fail to start loudly instead of silently trying to
    // connect to a local Mongo that doesn't exist on Render.
    @Value("${MONGODB_URI}")
    private String mongoUri;

    @Value("${spring.data.mongodb.database:chatapp}")
    private String databaseName;

    @Override
    protected String getDatabaseName() {
        return databaseName;
    }

    @Override
    public MongoClient mongoClient() {
        return MongoClients.create(mongoUri);
    }
}