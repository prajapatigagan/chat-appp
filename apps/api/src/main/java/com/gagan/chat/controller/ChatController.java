package com.gagan.chat.controller;

import com.gagan.chat.entities.Message;
import com.gagan.chat.entities.Room;
import com.gagan.chat.playload.MessageRequest;
import com.gagan.chat.repositories.RoomRepository;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

@Controller
// @CrossOrigin(origins = "http://localhost:3000")
@CrossOrigin(origins = {"https://chat-appp-web-five.vercel.app"})
public class ChatController {

    private final RoomRepository roomRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatController(
            RoomRepository roomRepository,
            SimpMessagingTemplate messagingTemplate
    ) {
        this.roomRepository = roomRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/sendMessage/{roomId}")
    @SendTo("/topic/room/{roomId}")
    public void sendMessage(
            @DestinationVariable String roomId,
            MessageRequest request
    ) {
        Room room = roomRepository.findByRoomId(roomId);

        if (room == null) {
            room = new Room();
            room.setRoomId(roomId);
            room.setMessages(new ArrayList<>());
        }

        Message message = new Message();
        message.setSender(request.getSender());
        message.setContent(request.getContent());
        message.setTimeStamp(LocalDateTime.now());
        message.setStatus("DELIVERED"); // server pe aaya = delivered

        if (request.getFileUrl() != null) {
            message.setFileUrl(request.getFileUrl());
        }
        if (request.getFileType() != null) {
            message.setFileType(request.getFileType());
        }

        room.getMessages().add(message);
        roomRepository.save(room);

        messagingTemplate.convertAndSend(
                "/topic/room/" + roomId,
                message
        );
    }

    // ── SEEN handler — ADD KARO ────────────────────────────────
    @MessageMapping("/seen/{roomId}")
    public void markAsSeen(
            @DestinationVariable String roomId,
            @Payload Map<String, String> payload
    ) {
        String viewer = payload.get("viewer");

        Room room = roomRepository.findByRoomId(roomId);
        if (room == null) return;

        boolean changed = false;

        for (Message message : room.getMessages()) {
            // Jo messages viewer ne nahi bheje unhe SEEN karo
            if (!message.getSender().equals(viewer)
                    && !"SEEN".equals(message.getStatus())) {
                message.setStatus("SEEN");
                changed = true;
            }
        }

        if (changed) {
            roomRepository.save(room);
        }

        // Hamesha notify karo — chahe change ho ya na ho
        messagingTemplate.convertAndSend(
                "/topic/seen/" + roomId,
                payload
        );

        System.out.println("Seen by: " + viewer + " in room: " + roomId);
    }

    // user online/offline status
    public void sendUserStatus(String userId, boolean online) {
        Map<String, Object> status = new HashMap<>();
        status.put("userId", userId);
        status.put("online", online);

        messagingTemplate.convertAndSend("/topic/status", (Object) status);
    }
}