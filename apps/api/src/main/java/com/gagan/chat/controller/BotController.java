package com.gagan.chat.controller;

import com.gagan.chat.services.GroqService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/bot")
@CrossOrigin(origins = "*")
public class BotController {

    @Autowired
    private GroqService groqService; 
    @PostMapping("/reply")
    public ResponseEntity<Map<String, String>> getReply(@RequestBody Map<String, String> request) {
        String userMessage = request.get("message");
        String reply = groqService.getReply(userMessage);

        Map<String, String> response = new HashMap<>();
        response.put("reply", reply);
        return ResponseEntity.ok(response);
    }
}