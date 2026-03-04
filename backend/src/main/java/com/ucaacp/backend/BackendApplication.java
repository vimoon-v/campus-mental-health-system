package com.ucaacp.backend;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;


@SpringBootApplication
@EnableScheduling
public class BackendApplication {

    @Value("${app.avatar.upload-dir:backend/static/uploads/avatar}")
    private String avatarUploadDir;

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                // 开发环境允许前端跨域访问
                registry.addMapping("/api/**")
                        .allowedOrigins("http://localhost:3000", "http://localhost:3001")
                        .allowedMethods("GET", "POST", "PUT", "DELETE")
                        .allowCredentials(true);
            }

            @Override
            public void addResourceHandlers(ResourceHandlerRegistry registry) {
                String avatarResourceLocation = Paths.get(avatarUploadDir).toAbsolutePath().normalize().toUri().toString();
                registry.addResourceHandler("/uploads/avatar/**")
                        .addResourceLocations(avatarResourceLocation);
                // 静态资源处理
                registry.addResourceHandler("/**")
                        .addResourceLocations("classpath:/static/");
            }
        };
    }
}
