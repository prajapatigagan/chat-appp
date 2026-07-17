package com.gagan.chat.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = "*")
public class FileUploadController {

    private static final String UPLOAD_DIR = "uploads";

    @PostMapping("/upload")
    public ResponseEntity<String> uploadFile(
            @RequestParam("file") MultipartFile file
    ) {
        try {

            // file empty check
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body("No file selected");
            }

            // create uploads folder if not exists
            Path uploadPath = Paths.get(UPLOAD_DIR);

            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // safe file name
            String originalFileName =
                    StringUtils.cleanPath(file.getOriginalFilename());

            String fileName =
                    UUID.randomUUID() + "_" + originalFileName;

            // destination path
            Path filePath = uploadPath.resolve(fileName);

            // save file
            Files.copy(file.getInputStream(), filePath);

            // file url
            // String fileUrl ="${process.env.NEXT_PUBLIC_BACKEND_URL}uploads/" + fileName;
            String fileUrl = "https://chat-app-k08c.onrender.com/uploads/" + fileName;

            return ResponseEntity.ok(fileUrl);

        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.internalServerError()
                    .body("Upload failed: " + e.getMessage());
        }
    }
}