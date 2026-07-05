package com.gagan.chat;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;

@SpringBootApplication
public class ChatAppBackendApplication {
	  @Value("${MONGODB_URI:NOT_FOUND}")
    private String mongoUri;

	public static void main(String[] args) {
		SpringApplication.run(ChatAppBackendApplication.class, args);

	}
	 @Bean
    CommandLineRunner test() {
        return args -> {
            System.out.println("====================================");
            // System.out.println("MONGODB_URI = " + mongoUri);
            System.out.println("====================================");
        };
    }

}
