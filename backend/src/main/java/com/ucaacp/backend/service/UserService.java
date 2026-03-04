package com.ucaacp.backend.service;


import com.ucaacp.backend.entity.User;
import com.ucaacp.backend.entity.DTO.UserDTO;
import com.ucaacp.backend.entity.enums.ProvinceCN;
import com.ucaacp.backend.entity.enums.UserRole;
import com.ucaacp.backend.repository.UserRepository;
import com.ucaacp.backend.utils.return_object.ReturnCode;
import com.ucaacp.backend.utils.return_object.ReturnObject;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Value("${app.avatar.upload-dir:backend/static/uploads/avatar}")
    private String avatarUploadDir;

    @Value("${app.avatar.url-prefix:/uploads/avatar/}")
    private String avatarUrlPrefix;

    private static final long MAX_AVATAR_SIZE = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(".jpg", ".jpeg", ".png", ".gif", ".webp");

    public static final String DISABLED_PASSWORD_PREFIX = "DISABLED";
    public static final String DEFAULT_RESET_PASSWORD = "Reset123!";


    /**
     * 用户登录验证
     */
    public Optional<User> login(String username, String password) {
        return userRepository.findByUsernameAndPassword(username, password);
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    /**
     * 用户注册
     */
    public User signUp(@Valid User user) {
        return userRepository.save(user);
    }


    /**
     * 检查用户名是否存在
     */
    public boolean exits(String username) {
        return userRepository.findByUsername(username).isPresent();
    }

    /**
     * 更新用户密码
    */
    public int updatePassword(String username, String newPassword) {
        return userRepository.updatePassword(username, newPassword);
    }

    public boolean isDisabled(User user) {
        if (user == null || user.getPassword() == null) {
            return false;
        }
        return user.getPassword().startsWith(DISABLED_PASSWORD_PREFIX);
    }

    public int disableAccount(String username) {
        String disabledPassword = DISABLED_PASSWORD_PREFIX + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        return userRepository.updatePassword(username, disabledPassword);
    }

    public int enableAccount(String username, String newPassword) {
        String password = (newPassword == null || newPassword.isBlank()) ? DEFAULT_RESET_PASSWORD : newPassword;
        return userRepository.updatePassword(username, password);
    }

    public int resetPasswordByAdmin(String username, String newPassword) {
        String password = (newPassword == null || newPassword.isBlank()) ? DEFAULT_RESET_PASSWORD : newPassword;
        return userRepository.updatePassword(username, password);
    }

    public List<String> findAllDisabledUsernames() {
        return userRepository.findUsernamesByPasswordPrefix(DISABLED_PASSWORD_PREFIX);
    }

    /**
     * 注销账号
     */
    public User closeAccount(String username) {
        return userRepository.deleteByUsername(username);
    }


    /**
     * 保存用户
     */
    public User updateUser(@Valid User user) {
        return userRepository.save(user);
    }

    public String storeAvatar(MultipartFile file, String username) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("请选择头像文件");
        }
        if (file.getSize() > MAX_AVATAR_SIZE) {
            throw new IllegalArgumentException("头像大小不能超过5MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("头像仅支持图片格式");
        }

        String extension = resolveExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("头像格式仅支持 JPG、PNG、GIF、WEBP");
        }

        Path uploadDirectory = Paths.get(avatarUploadDir).toAbsolutePath().normalize();
        Files.createDirectories(uploadDirectory);

        String safeUsername = username == null ? "user" : username.replaceAll("[^a-zA-Z0-9_-]", "_");
        String filename = safeUsername + "_" + UUID.randomUUID().toString().replace("-", "") + extension;
        Path target = uploadDirectory.resolve(filename).normalize();
        file.transferTo(target.toFile());

        String normalizedPrefix = avatarUrlPrefix.endsWith("/") ? avatarUrlPrefix : avatarUrlPrefix + "/";
        return normalizedPrefix + filename;
    }

    private String resolveExtension(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return ".png";
        }
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == originalFilename.length() - 1) {
            return ".png";
        }
        return originalFilename.substring(dotIndex).toLowerCase();
    }


    /**
     * 依据学校所在省份和学校查找所有教师（保护用户密码）
     * @param schoolProvince 学校所在省份
     * @param school 学校
     * @return 用户列表
     */
    public List<UserDTO> findAllTeachersBySchoolProvinceAndSchool(ProvinceCN schoolProvince, String school) {
        List<UserDTO> users = userRepository.findUsersByRoleAnAndSchoolProvinceAndAndSchool(UserRole.TEACHER, schoolProvince, school);
        users.forEach(user -> {
           //user.setPassword(null);//保护密码
        });
        return users;
    }

    public List<UserDTO> findAllUserDTO(){
        return userRepository.findAllUserDTO();
    }
}
