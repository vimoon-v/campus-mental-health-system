package com.ucaacp.backend.controller;

import com.ucaacp.backend.annotation.CheckCaptcha;
import com.ucaacp.backend.annotation.CheckLogin;
import com.ucaacp.backend.annotation.CheckUserRole;
import com.ucaacp.backend.entity.DTO.UserDTO;
import com.ucaacp.backend.entity.User;
import com.ucaacp.backend.entity.attribute_converter.GenderConverter;
import com.ucaacp.backend.entity.attribute_converter.ProvinceCN_Converter;
import com.ucaacp.backend.entity.attribute_converter.UserPositionConverter;
import com.ucaacp.backend.entity.attribute_converter.UserRoleConverter;
import com.ucaacp.backend.entity.enums.ProvinceCN;
import com.ucaacp.backend.entity.enums.UserRole;
import com.ucaacp.backend.service.CaptchaService;
import com.ucaacp.backend.service.UserService;
import com.ucaacp.backend.utils.return_object.ReturnCode;
import com.ucaacp.backend.utils.return_object.ReturnObject;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.MediaType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.util.*;

@RestController
@RequestMapping("/api/user")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private CaptchaService captchaService;

    @CheckCaptcha(captchaKeyField = "captchaKey", captchaField = "captcha")
    @PostMapping("/login")
    public ReturnObject login(@RequestBody Map<String, Object> loginRequestBody, HttpSession session) {
        ProvinceCN_Converter provinceCNConverter = new ProvinceCN_Converter();
        UserRoleConverter userRoleConverter = new UserRoleConverter();

        String username = loginRequestBody.get("username") == null ? null : loginRequestBody.get("username").toString();
        String password = loginRequestBody.get("password") == null ? null : loginRequestBody.get("password").toString();
        String role = loginRequestBody.get("role") == null ? null : loginRequestBody.get("role").toString();
        String schoolProvince = loginRequestBody.get("schoolProvince") == null ? null : loginRequestBody.get("schoolProvince").toString();
        String school = loginRequestBody.get("school") == null ? null : loginRequestBody.get("school").toString();

        Integer roleCode;
        try {
            roleCode = role == null ? null : Integer.parseInt(role);
        } catch (NumberFormatException exception) {
            return ReturnObject.fail("用户角色错误");
        }
        UserRole requestRole = userRoleConverter.convertToEntityAttribute(roleCode);
        boolean platformLogin = requestRole != null && requestRole.isPlatformAdmin();

        ProvinceCN selectedProvince = null;
        String selectedSchool = null;
        if (!platformLogin) {
            if (schoolProvince == null || schoolProvince.isBlank()) {
                return ReturnObject.fail("请选择学校所在省份");
            }
            if (school == null || school.isBlank()) {
                return ReturnObject.fail("请选择所属学校");
            }
            try {
                selectedProvince = provinceCNConverter.convertToEntityAttribute(Long.parseLong(schoolProvince));
            } catch (NumberFormatException exception) {
                return ReturnObject.fail("学校所在省份错误");
            }
            if (selectedProvince == null) {
                return ReturnObject.fail("学校所在省份错误");
            }
            selectedSchool = school.trim();
        }

        Optional<User> userByUsername = userService.findByUsername(username);
        if (userByUsername.isPresent() && userService.isDisabled(userByUsername.get())) {
            return ReturnObject.fail("账号已被禁用，请联系管理员");
        }

        Optional<User> userOptional = userService.login(username, password);
        if (userOptional.isEmpty()) {
            return ReturnObject.fail("用户名或密码错误");
        }
        if (!userOptional.get().getRole().equals(requestRole)) {
            return ReturnObject.fail("用户角色错误");
        }

        User user = userOptional.get();
        if (!user.getRole().isPlatformAdmin()) {
            if (!sameSchool(user.getSchoolProvince(), user.getSchool(), selectedProvince, selectedSchool)) {
                return ReturnObject.fail("请选择与账号一致的省份和学校");
            }
        }

        user.setPassword(null);
        session.setAttribute("user", user);
        session.setAttribute("password", password);
        if (user.getRole().isPlatformAdmin()) {
            session.removeAttribute("loginSchoolProvince");
            session.removeAttribute("loginSchool");
        } else {
            session.setAttribute("loginSchoolProvince", selectedProvince);
            session.setAttribute("loginSchool", selectedSchool);
        }
        return ReturnObject.success("登录成功");
    }

    @CheckCaptcha(captchaKeyField = "captchaKey", captchaField = "captcha")
    @PostMapping("/signup")
    public ReturnObject signup(@RequestBody Map<String, Object> signupRequestBody, HttpSession session) {
        GenderConverter genderConverter = new GenderConverter();
        ProvinceCN_Converter provinceCNConverter = new ProvinceCN_Converter();
        UserRoleConverter userRoleConverter = new UserRoleConverter();
        UserPositionConverter userPositionConverter = new UserPositionConverter();

        String username = signupRequestBody.get("username") == null ? null : signupRequestBody.get("username").toString();
        String nickname = signupRequestBody.get("nickname") == null ? null : signupRequestBody.get("nickname").toString();
        String name = signupRequestBody.get("name") == null ? null : signupRequestBody.get("name").toString();
        String password = signupRequestBody.get("password") == null ? null : signupRequestBody.get("password").toString();
        String confirmedPassword = signupRequestBody.get("confirmedPassword") == null ? null : signupRequestBody.get("confirmedPassword").toString();
        String gender = signupRequestBody.get("gender") == null ? null : signupRequestBody.get("gender").toString();
        String schoolProvince = signupRequestBody.get("schoolProvince") == null ? null : signupRequestBody.get("schoolProvince").toString();
        String school = signupRequestBody.get("school") == null ? null : signupRequestBody.get("school").toString();
        String secondaryUnit = signupRequestBody.get("secondaryUnit") == null ? null : signupRequestBody.get("secondaryUnit").toString();
        String major = signupRequestBody.get("major") == null ? null : signupRequestBody.get("major").toString();
        String role = signupRequestBody.get("role") == null ? null : signupRequestBody.get("role").toString();
        String position = signupRequestBody.get("position") == null ? null : signupRequestBody.get("position").toString();
        String email = signupRequestBody.get("email") == null ? null : signupRequestBody.get("email").toString();
        String phoneNumber = signupRequestBody.get("phoneNumber") == null ? null : signupRequestBody.get("phoneNumber").toString();
        String qq = signupRequestBody.get("qq") == null ? null : signupRequestBody.get("qq").toString();
        String wechat = signupRequestBody.get("wechat") == null ? null : signupRequestBody.get("wechat").toString();
        String avatar = normalizeAvatarUrl(signupRequestBody.get("avatar"));
        UserRole userRole;
        try {
            userRole = role == null || role.isBlank() ? null : userRoleConverter.convertToEntityAttribute(Integer.parseInt(role));
        } catch (NumberFormatException exception) {
            return ReturnObject.fail("用户角色错误");
        }

        if (!Objects.equals(password, confirmedPassword)) {
            return ReturnObject.fail("两次密码输入不一致");
        }
        if (userService.exits(username)) {
            return ReturnObject.fail("用户名\"" + username + "\"已经存在");
        }
        if (nickname == null || nickname.trim().isEmpty()) {
            return ReturnObject.fail("昵称不能为空");
        }
        if (userRole == UserRole.SYSTEM_ADMIN) {
            return ReturnObject.fail("平台管理员账号仅允许系统预置，不支持注册");
        }

        User user = new User();
        user.setUsername(username);
        user.setNickname(nickname.trim());
        user.setDescription("");
        user.setName(name);
        user.setPassword(password);
        user.setGender(gender == null ? null : genderConverter.convertToEntityAttribute(Integer.parseInt(gender)));
        user.setSchoolProvince(schoolProvince == null ? null : provinceCNConverter.convertToEntityAttribute(Long.parseLong(schoolProvince)));
        user.setSchool(school);
        user.setSecondaryUnit(secondaryUnit);
        user.setMajor(major);
        user.setRole(userRole);
        user.setPosition(userPositionConverter.convertToEntityAttribute(position));
        user.setEmail(email);
        user.setPhoneNumber(phoneNumber);
        user.setQq(qq);
        user.setWechat(wechat);
        user.setAvatar(avatar);
        user.setRegistrationTime(new Date());

        if (userService.signUp(user) != null) {
            return ReturnObject.success("注册成功");
        }
        return ReturnObject.fail("注册失败");
    }

    @GetMapping("/check_login")
    public ReturnObject checkLogin(HttpSession session) {
        Map<String, String> data = new HashMap<>();
        boolean isLogin = session.getAttribute("user") != null;
        data.put("isLogin", isLogin ? "true" : "false");
        return ReturnObject.success(data);
    }

    @CheckLogin
    @GetMapping("/logged-in_user")
    public ReturnObject loggedInUser(HttpSession session) {
        return ReturnObject.success(((User) session.getAttribute("user")).getReturnData());
    }

    @CheckLogin
    @PostMapping("/logout")
    public ReturnObject logout(HttpSession session) {
        session.removeAttribute("user");
        session.removeAttribute("password");
        session.removeAttribute("loginSchoolProvince");
        session.removeAttribute("loginSchool");
        session.removeAttribute("adminScopeSchoolProvince");
        session.removeAttribute("adminScopeSchool");
        return ReturnObject.success("用户已登出");
    }

    @CheckLogin
    @CheckCaptcha(captchaKeyField = "captchaKey", captchaField = "captcha")
    @PostMapping("/update_password")
    public ReturnObject updatePassword(@RequestBody Map<String, Object> updatePasswordRequestBody, HttpSession session) {
        String username = updatePasswordRequestBody.get("username") == null ? null : updatePasswordRequestBody.get("username").toString();
        String oldPassword = updatePasswordRequestBody.get("oldPassword") == null ? null : updatePasswordRequestBody.get("oldPassword").toString();
        String newPassword = updatePasswordRequestBody.get("newPassword") == null ? null : updatePasswordRequestBody.get("newPassword").toString();
        String confirmedNewPassword = updatePasswordRequestBody.get("confirmedNewPassword") == null ? null : updatePasswordRequestBody.get("confirmedNewPassword").toString();

        if (!Objects.equals(newPassword, confirmedNewPassword)) {
            return ReturnObject.fail("两次新密码输入不一致");
        }
        if (Objects.equals(oldPassword, newPassword)) {
            return ReturnObject.fail("新密码不能与旧密码相同");
        }
        if (!((User) session.getAttribute("user")).getUsername().equals(username)) {
            return ReturnObject.fail(ReturnCode.UNAUTHORIZED.getCode(), "用户名错误");
        }
        if (!userService.exits(username)) {
            return ReturnObject.fail("用户名\"" + username + "\"不存在");
        }
        if (userService.login(username, oldPassword).isEmpty()) {
            return ReturnObject.fail("用户名密码错误");
        }

        if (userService.updatePassword(username, newPassword) >= 0) {
            return ReturnObject.success("更新密码成功");
        }
        return ReturnObject.fail("更新密码失败");
    }

    @CheckLogin
    @CheckCaptcha(captchaKeyField = "captchaKey", captchaField = "captcha")
    @PostMapping("/close_account")
    public ReturnObject closeAccount(@RequestBody Map<String, Object> closeAccountRequestBody, HttpSession session) {
        String username = closeAccountRequestBody.get("username") == null ? null : closeAccountRequestBody.get("username").toString();
        String password = closeAccountRequestBody.get("password") == null ? null : closeAccountRequestBody.get("password").toString();

        if (!((User) session.getAttribute("user")).getUsername().equals(username)) {
            return ReturnObject.fail(ReturnCode.UNAUTHORIZED.getCode(), "用户名错误");
        }
        if (!userService.exits(username)) {
            return ReturnObject.fail("用户名\"" + username + "\"不存在");
        }
        if (userService.login(username, password).isEmpty()) {
            return ReturnObject.fail("用户名密码错误");
        }

        if (userService.closeAccount(username) != null) {
            session.removeAttribute("user");
            session.removeAttribute("password");
            return ReturnObject.success("注销账号成功");
        }
        return ReturnObject.fail("注销账号失败");
    }

    @CheckLogin
    @PostMapping("update_user")
    public ReturnObject updateIndividualInformation(@RequestBody Map<String, Object> updateUserRequestBody, HttpSession session) {
        GenderConverter genderConverter = new GenderConverter();
        ProvinceCN_Converter provinceCNConverter = new ProvinceCN_Converter();
        UserPositionConverter userPositionConverter = new UserPositionConverter();

        String username = updateUserRequestBody.get("username") == null ? null : updateUserRequestBody.get("username").toString();
        String nickname = updateUserRequestBody.get("nickname") == null ? null : updateUserRequestBody.get("nickname").toString();
        String description = updateUserRequestBody.get("description") == null ? null : updateUserRequestBody.get("description").toString();
        String name = updateUserRequestBody.get("name") == null ? null : updateUserRequestBody.get("name").toString();
        String gender = updateUserRequestBody.get("gender") == null ? null : updateUserRequestBody.get("gender").toString();
        String schoolProvince = updateUserRequestBody.get("schoolProvince") == null ? null : updateUserRequestBody.get("schoolProvince").toString();
        String school = updateUserRequestBody.get("school") == null ? null : updateUserRequestBody.get("school").toString();
        String secondaryUnit = updateUserRequestBody.get("secondaryUnit") == null ? null : updateUserRequestBody.get("secondaryUnit").toString();
        String major = updateUserRequestBody.get("major") == null ? null : updateUserRequestBody.get("major").toString();
        String position = updateUserRequestBody.get("position") == null ? null : updateUserRequestBody.get("position").toString();
        String email = updateUserRequestBody.get("email") == null ? null : updateUserRequestBody.get("email").toString();
        String phoneNumber = updateUserRequestBody.get("phoneNumber") == null ? null : updateUserRequestBody.get("phoneNumber").toString();
        String qq = updateUserRequestBody.get("qq") == null ? null : updateUserRequestBody.get("qq").toString();
        String wechat = updateUserRequestBody.get("wechat") == null ? null : updateUserRequestBody.get("wechat").toString();

        String password = session.getAttribute("password").toString();

        if (!userService.exits(username)) {
            return ReturnObject.fail("用户名\"" + username + "\"不存在");
        }

        Optional<User> optionalUser = userService.login(username, password);
        if (optionalUser.isEmpty()) {
            return ReturnObject.fail("用户名密码错误");
        }

        User user = optionalUser.get();
        user.setNickname(nickname);
        user.setDescription(description);
        user.setName(name);
        user.setPassword(password);
        user.setGender(gender == null ? null : genderConverter.convertToEntityAttribute(Integer.parseInt(gender)));
        user.setSchoolProvince(schoolProvince == null ? null : provinceCNConverter.convertToEntityAttribute(Long.parseLong(schoolProvince)));
        user.setSchool(school);
        user.setSecondaryUnit(secondaryUnit);
        user.setMajor(major);
        user.setPosition(userPositionConverter.convertToEntityAttribute(position));
        user.setEmail(email);
        user.setPhoneNumber(phoneNumber);
        user.setQq(qq);
        user.setWechat(wechat);
        if (updateUserRequestBody.containsKey("avatar")) {
            String avatar = normalizeAvatarUrl(updateUserRequestBody.get("avatar"));
            user.setAvatar(avatar);
        }

        if (userService.updateUser(user) != null) {
            session.setAttribute("user", user);
            return ReturnObject.success("修改用户信息成功");
        }
        return ReturnObject.fail("修改用户信息失败");
    }

    @CheckLogin
    @PostMapping(value = "upload_avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ReturnObject uploadAvatar(@RequestParam("file") MultipartFile file, HttpSession session) {
        User currentUser = (User) session.getAttribute("user");
        if (currentUser == null) {
            return ReturnObject.fail(ReturnCode.UNAUTHORIZED.getCode(), "用户未登录");
        }
        try {
            String relativeUrl = userService.storeAvatar(file, currentUser.getUsername());
            String baseUrl = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
            Map<String, Object> data = new HashMap<>();
            data.put("url", baseUrl + relativeUrl);
            data.put("relativeUrl", relativeUrl);
            return ReturnObject.success("头像上传成功", data);
        } catch (IllegalArgumentException e) {
            return ReturnObject.fail(e.getMessage());
        } catch (Exception e) {
            return ReturnObject.error("头像上传失败");
        }
    }

    @CheckLogin
    @GetMapping("all_teachers")
    public ReturnObject getAllTeachers(@RequestParam Map<String, String> params, HttpSession session) {
        ProvinceCN_Converter provinceCNConverter = new ProvinceCN_Converter();
        Object currentUserObj = session.getAttribute("user");
        if (!(currentUserObj instanceof User currentUser)) {
            return ReturnObject.fail(ReturnCode.UNAUTHORIZED.getCode(), "用户未登录");
        }

        ProvinceCN targetProvince;
        String targetSchool;

        if (currentUser.getRole().isPlatformAdmin()) {
            String schoolProvince = params.get("schoolProvince");
            String school = params.get("school");
            if ((schoolProvince == null || schoolProvince.isBlank()) || (school == null || school.isBlank())) {
                SchoolScope scope = resolveSessionSchoolScope(session);
                if (!scope.enabled()) {
                    return ReturnObject.fail("平台管理员请先选择学校视角，或在请求中传入学校参数");
                }
                targetProvince = scope.schoolProvince();
                targetSchool = scope.school();
            } else {
                try {
                    targetProvince = provinceCNConverter.convertToEntityAttribute(Long.valueOf(schoolProvince));
                } catch (NumberFormatException exception) {
                    return ReturnObject.fail("学校所在省份错误");
                }
                targetSchool = school.trim();
            }
        } else {
            targetProvince = currentUser.getSchoolProvince();
            targetSchool = currentUser.getSchool();
        }

        if (targetProvince == null || targetSchool == null || targetSchool.isBlank()) {
            return ReturnObject.fail("学校信息不存在，请先完善个人资料");
        }

        List<UserDTO> teachers = userService.findAllTeachersBySchoolProvinceAndSchool(targetProvince, targetSchool);

        if (teachers != null) {
            return ReturnObject.success(teachers);
        }
        return ReturnObject.fail("学校所在省份或学校错误");
    }

    @CheckLogin
    @CheckUserRole(UserRole.SYSTEM_ADMIN)
    @GetMapping("admin/scope")
    public ReturnObject getAdminScope(HttpSession session) {
        SchoolScope scope = resolveSessionSchoolScope(session);
        Map<String, Object> data = new HashMap<>();
        data.put("enabled", scope.enabled());
        data.put("schoolProvince", scope.schoolProvince() == null ? null : scope.schoolProvince().getCode());
        data.put("school", scope.school());
        return ReturnObject.success(data);
    }

    @CheckLogin
    @CheckUserRole(UserRole.SYSTEM_ADMIN)
    @PostMapping("admin/scope")
    public ReturnObject setAdminScope(@RequestBody Map<String, Object> params, HttpSession session) {
        ProvinceCN_Converter provinceCNConverter = new ProvinceCN_Converter();
        String schoolProvinceRaw = params.get("schoolProvince") == null ? "" : params.get("schoolProvince").toString().trim();
        String school = params.get("school") == null ? "" : params.get("school").toString().trim();

        boolean clearScope = schoolProvinceRaw.isBlank() || school.isBlank();
        if (clearScope) {
            session.removeAttribute("adminScopeSchoolProvince");
            session.removeAttribute("adminScopeSchool");
            Map<String, Object> data = new HashMap<>();
            data.put("enabled", false);
            data.put("schoolProvince", null);
            data.put("school", null);
            return ReturnObject.success("已切换为跨学校视角", data);
        }

        ProvinceCN schoolProvince;
        try {
            schoolProvince = provinceCNConverter.convertToEntityAttribute(Long.valueOf(schoolProvinceRaw));
        } catch (NumberFormatException exception) {
            return ReturnObject.fail("学校所在省份错误");
        }
        if (schoolProvince == null) {
            return ReturnObject.fail("学校所在省份错误");
        }

        session.setAttribute("adminScopeSchoolProvince", schoolProvince.getCode());
        session.setAttribute("adminScopeSchool", school);

        Map<String, Object> data = new HashMap<>();
        data.put("enabled", true);
        data.put("schoolProvince", schoolProvince.getCode());
        data.put("school", school);
        return ReturnObject.success("学校视角已更新", data);
    }

    @CheckLogin
    @CheckUserRole(UserRole.ADMIN)
    @GetMapping("list_all")
    public ReturnObject listAll(HttpSession session) {
        Object currentUserObj = session.getAttribute("user");
        if (!(currentUserObj instanceof User currentUser)) {
            return ReturnObject.fail(ReturnCode.UNAUTHORIZED.getCode(), "用户未登录");
        }

        List<UserDTO> userDTOList = userService.findAllUserDTO();
        SchoolScope scope = resolveEffectiveScope(currentUser, session);
        if (scope.enabled()) {
            userDTOList = userDTOList.stream()
                    .filter(userDTO -> userDTO != null && sameSchool(
                            scope.schoolProvince(),
                            scope.school(),
                            userDTO.getSchoolProvince(),
                            userDTO.getSchool()
                    ))
                    .toList();
        }
        if (!currentUser.getRole().isPlatformAdmin()) {
            userDTOList = userDTOList.stream()
                    .filter(userDTO -> userDTO.getRole() != UserRole.SYSTEM_ADMIN)
                    .toList();
        }
        if (userDTOList != null) {
            return ReturnObject.success(userDTOList);
        }
        return ReturnObject.fail("获取失败");
    }

    @CheckLogin
    @CheckUserRole(UserRole.ADMIN)
    @GetMapping("admin/disabled_usernames")
    public ReturnObject listDisabledUsernames(HttpSession session) {
        Object currentUserObj = session.getAttribute("user");
        if (!(currentUserObj instanceof User currentUser)) {
            return ReturnObject.fail(ReturnCode.UNAUTHORIZED.getCode(), "用户未登录");
        }
        List<String> usernames = userService.findAllDisabledUsernames();
        if (resolveEffectiveScope(currentUser, session).enabled()) {
            usernames = usernames.stream()
                    .filter(username -> userService.findByUsername(username)
                            .map(targetUser -> canAdminManageTarget(currentUser, targetUser, session))
                            .orElse(false))
                    .toList();
        }
        return ReturnObject.success(usernames);
    }

    @CheckLogin
    @CheckUserRole(UserRole.ADMIN)
    @PostMapping("admin/disable")
    public ReturnObject adminDisable(@RequestBody Map<String, Object> params, HttpSession session) {
        String username = params.get("username") == null ? "" : params.get("username").toString();
        if (username.isBlank()) {
            return ReturnObject.fail("用户名不能为空");
        }
        User currentUser = (User) session.getAttribute("user");
        if (currentUser == null) {
            return ReturnObject.fail(ReturnCode.UNAUTHORIZED.getCode(), "用户未登录");
        }
        Optional<User> optionalTargetUser = userService.findByUsername(username);
        if (optionalTargetUser.isEmpty()) {
            return ReturnObject.fail("用户名\"" + username + "\"不存在");
        }
        User targetUser = optionalTargetUser.get();
        if (!canAdminManageTarget(currentUser, targetUser, session)) {
            return ReturnObject.fail(ReturnCode.UNAUTHORIZED.getCode(), "无权限操作该账号");
        }
        if (currentUser != null && username.equals(currentUser.getUsername())) {
            return ReturnObject.fail("不能禁用当前登录管理员");
        }
        if (userService.disableAccount(username) >= 0) {
            return ReturnObject.success("禁用账号成功");
        }
        return ReturnObject.fail("禁用账号失败");
    }

    @CheckLogin
    @CheckUserRole(UserRole.ADMIN)
    @PostMapping("admin/enable")
    public ReturnObject adminEnable(@RequestBody Map<String, Object> params, HttpSession session) {
        String username = params.get("username") == null ? "" : params.get("username").toString();
        String newPassword = params.get("newPassword") == null ? null : params.get("newPassword").toString();
        if (username.isBlank()) {
            return ReturnObject.fail("用户名不能为空");
        }
        User currentUser = (User) session.getAttribute("user");
        if (currentUser == null) {
            return ReturnObject.fail(ReturnCode.UNAUTHORIZED.getCode(), "用户未登录");
        }
        Optional<User> optionalTargetUser = userService.findByUsername(username);
        if (optionalTargetUser.isEmpty()) {
            return ReturnObject.fail("用户名\"" + username + "\"不存在");
        }
        User targetUser = optionalTargetUser.get();
        if (!canAdminManageTarget(currentUser, targetUser, session)) {
            return ReturnObject.fail(ReturnCode.UNAUTHORIZED.getCode(), "无权限操作该账号");
        }
        if (userService.enableAccount(username, newPassword) >= 0) {
            Map<String, Object> data = new HashMap<>();
            data.put("defaultPassword", (newPassword == null || newPassword.isBlank()) ? UserService.DEFAULT_RESET_PASSWORD : newPassword);
            return ReturnObject.success(data);
        }
        return ReturnObject.fail("启用账号失败");
    }

    @CheckLogin
    @CheckUserRole(UserRole.ADMIN)
    @PostMapping("admin/reset_password")
    public ReturnObject adminResetPassword(@RequestBody Map<String, Object> params, HttpSession session) {
        String username = params.get("username") == null ? "" : params.get("username").toString();
        String newPassword = params.get("newPassword") == null ? null : params.get("newPassword").toString();
        if (username.isBlank()) {
            return ReturnObject.fail("用户名不能为空");
        }
        User currentUser = (User) session.getAttribute("user");
        if (currentUser == null) {
            return ReturnObject.fail(ReturnCode.UNAUTHORIZED.getCode(), "用户未登录");
        }
        Optional<User> optionalTargetUser = userService.findByUsername(username);
        if (optionalTargetUser.isEmpty()) {
            return ReturnObject.fail("用户名\"" + username + "\"不存在");
        }
        User targetUser = optionalTargetUser.get();
        if (!canAdminManageTarget(currentUser, targetUser, session)) {
            return ReturnObject.fail(ReturnCode.UNAUTHORIZED.getCode(), "无权限操作该账号");
        }
        if (userService.resetPasswordByAdmin(username, newPassword) >= 0) {
            Map<String, Object> data = new HashMap<>();
            data.put("defaultPassword", (newPassword == null || newPassword.isBlank()) ? UserService.DEFAULT_RESET_PASSWORD : newPassword);
            return ReturnObject.success(data);
        }
        return ReturnObject.fail("重置密码失败");
    }

    @CheckLogin
    @CheckUserRole(UserRole.ADMIN)
    @PostMapping("admin/delete")
    public ReturnObject adminDelete(@RequestBody Map<String, Object> params, HttpSession session) {
        String username = params.get("username") == null ? "" : params.get("username").toString();
        if (username.isBlank()) {
            return ReturnObject.fail("用户名不能为空");
        }
        User currentUser = (User) session.getAttribute("user");
        if (currentUser == null) {
            return ReturnObject.fail(ReturnCode.UNAUTHORIZED.getCode(), "用户未登录");
        }
        Optional<User> optionalTargetUser = userService.findByUsername(username);
        if (optionalTargetUser.isEmpty()) {
            return ReturnObject.fail("用户名\"" + username + "\"不存在");
        }
        User targetUser = optionalTargetUser.get();
        if (!canAdminManageTarget(currentUser, targetUser, session)) {
            return ReturnObject.fail(ReturnCode.UNAUTHORIZED.getCode(), "无权限操作该账号");
        }
        if (currentUser != null && username.equals(currentUser.getUsername())) {
            return ReturnObject.fail("不能删除当前登录管理员");
        }
        if (userService.closeAccount(username) != null) {
            return ReturnObject.success("删除账号成功");
        }
        return ReturnObject.fail("删除账号失败");
    }

    @CheckLogin
    @CheckUserRole(UserRole.ADMIN)
    @PostMapping("admin/update")
    public ReturnObject adminUpdateUser(@RequestBody Map<String, Object> params, HttpSession session) {
        GenderConverter genderConverter = new GenderConverter();
        ProvinceCN_Converter provinceCNConverter = new ProvinceCN_Converter();
        UserRoleConverter userRoleConverter = new UserRoleConverter();
        UserPositionConverter userPositionConverter = new UserPositionConverter();

        String username = params.get("username") == null ? "" : params.get("username").toString();
        if (username.isBlank()) {
            return ReturnObject.fail("用户名不能为空");
        }
        User currentUser = (User) session.getAttribute("user");
        if (currentUser == null) {
            return ReturnObject.fail(ReturnCode.UNAUTHORIZED.getCode(), "用户未登录");
        }

        Optional<User> optionalUser = userService.findByUsername(username);
        if (optionalUser.isEmpty()) {
            return ReturnObject.fail("用户名\"" + username + "\"不存在");
        }

        User user = optionalUser.get();
        if (!canAdminManageTarget(currentUser, user, session)) {
            return ReturnObject.fail(ReturnCode.UNAUTHORIZED.getCode(), "无权限操作该账号");
        }
        if (params.containsKey("nickname")) {
            String value = params.get("nickname") == null ? null : params.get("nickname").toString().trim();
            user.setNickname(value == null || value.isEmpty() ? null : value);
        }
        if (params.containsKey("description")) {
            String value = params.get("description") == null ? null : params.get("description").toString().trim();
            user.setDescription(value == null || value.isEmpty() ? null : value);
        }
        if (params.containsKey("name")) {
            String value = params.get("name") == null ? null : params.get("name").toString().trim();
            if (value != null && !value.isEmpty()) {
                user.setName(value);
            }
        }
        if (params.containsKey("gender")) {
            String value = params.get("gender") == null ? null : params.get("gender").toString().trim();
            if (value != null && !value.isEmpty()) {
                user.setGender(genderConverter.convertToEntityAttribute(Integer.parseInt(value)));
            }
        }
        if (params.containsKey("schoolProvince")) {
            String value = params.get("schoolProvince") == null ? null : params.get("schoolProvince").toString().trim();
            if (value != null && !value.isEmpty()) {
                user.setSchoolProvince(provinceCNConverter.convertToEntityAttribute(Long.parseLong(value)));
            }
        }
        if (params.containsKey("school")) {
            String value = params.get("school") == null ? null : params.get("school").toString().trim();
            if (value != null && !value.isEmpty()) {
                user.setSchool(value);
            }
        }
        if (params.containsKey("secondaryUnit")) {
            String value = params.get("secondaryUnit") == null ? null : params.get("secondaryUnit").toString().trim();
            if (value != null && !value.isEmpty()) {
                user.setSecondaryUnit(value);
            }
        }
        if (params.containsKey("major")) {
            String value = params.get("major") == null ? null : params.get("major").toString().trim();
            user.setMajor(value == null || value.isEmpty() ? null : value);
        }
        if (params.containsKey("role")) {
            String value = params.get("role") == null ? null : params.get("role").toString().trim();
            if (value != null && !value.isEmpty()) {
                UserRole nextRole = userRoleConverter.convertToEntityAttribute(Integer.parseInt(value));
                if (nextRole == UserRole.SYSTEM_ADMIN && !currentUser.getRole().isPlatformAdmin()) {
                    return ReturnObject.fail(ReturnCode.UNAUTHORIZED.getCode(), "仅平台管理员可设置平台管理员角色");
                }
                user.setRole(nextRole);
            }
        }
        if (params.containsKey("position")) {
            String value = params.get("position") == null ? null : params.get("position").toString().trim();
            if (value != null && !value.isEmpty()) {
                user.setPosition(userPositionConverter.convertToEntityAttribute(value));
            }
        }
        if (params.containsKey("email")) {
            String value = params.get("email") == null ? null : params.get("email").toString().trim();
            if (value != null && !value.isEmpty()) {
                user.setEmail(value);
            }
        }
        if (params.containsKey("phoneNumber")) {
            String value = params.get("phoneNumber") == null ? null : params.get("phoneNumber").toString().trim();
            if (value != null && !value.isEmpty()) {
                user.setPhoneNumber(value);
            }
        }
        if (params.containsKey("qq")) {
            String value = params.get("qq") == null ? null : params.get("qq").toString().trim();
            user.setQq(value == null || value.isEmpty() ? null : value);
        }
        if (params.containsKey("wechat")) {
            String value = params.get("wechat") == null ? null : params.get("wechat").toString().trim();
            user.setWechat(value == null || value.isEmpty() ? null : value);
        }
        if (params.containsKey("avatar")) {
            String value = normalizeAvatarUrl(params.get("avatar"));
            user.setAvatar(value);
        }
        if (!currentUser.getRole().isPlatformAdmin()) {
            if (!sameSchool(
                    currentUser.getSchoolProvince(),
                    currentUser.getSchool(),
                    user.getSchoolProvince(),
                    user.getSchool()
            )) {
                return ReturnObject.fail(ReturnCode.UNAUTHORIZED.getCode(), "学校管理员不能将用户转移到其他学校");
            }
            if (user.getRole() == UserRole.SYSTEM_ADMIN) {
                return ReturnObject.fail(ReturnCode.UNAUTHORIZED.getCode(), "学校管理员不能设置平台管理员角色");
            }
        }

        if (userService.updateUser(user) != null) {
            return ReturnObject.success("更新用户信息成功");
        }
        return ReturnObject.fail("更新用户信息失败");
    }

    private boolean canAdminManageTarget(User currentUser, User targetUser, HttpSession session) {
        if (currentUser == null || targetUser == null || currentUser.getRole() == null || targetUser.getRole() == null) {
            return false;
        }
        if (currentUser.getRole().isPlatformAdmin()) {
            SchoolScope scope = resolveSessionSchoolScope(session);
            if (!scope.enabled()) {
                return true;
            }
            return sameSchool(
                    scope.schoolProvince(),
                    scope.school(),
                    targetUser.getSchoolProvince(),
                    targetUser.getSchool()
            );
        }
        if (!currentUser.getRole().isSchoolAdmin()) {
            return false;
        }
        if (targetUser.getRole().isPlatformAdmin()) {
            return false;
        }
        return sameSchool(
                currentUser.getSchoolProvince(),
                currentUser.getSchool(),
                targetUser.getSchoolProvince(),
                targetUser.getSchool()
        );
    }

    private SchoolScope resolveEffectiveScope(User currentUser, HttpSession session) {
        if (currentUser == null || currentUser.getRole() == null) {
            return new SchoolScope(false, null, null);
        }
        if (currentUser.getRole().isPlatformAdmin()) {
            return resolveSessionSchoolScope(session);
        }
        if (currentUser.getRole().isSchoolAdmin()) {
            return new SchoolScope(true, currentUser.getSchoolProvince(), currentUser.getSchool());
        }
        return new SchoolScope(false, null, null);
    }

    private SchoolScope resolveSessionSchoolScope(HttpSession session) {
        if (session == null) {
            return new SchoolScope(false, null, null);
        }
        ProvinceCN_Converter provinceCNConverter = new ProvinceCN_Converter();
        Object provinceObj = session.getAttribute("adminScopeSchoolProvince");
        Object schoolObj = session.getAttribute("adminScopeSchool");
        String school = schoolObj == null ? null : schoolObj.toString().trim();

        if (school == null || school.isBlank()) {
            return new SchoolScope(false, null, null);
        }

        ProvinceCN province = null;
        if (provinceObj instanceof Number number) {
            province = provinceCNConverter.convertToEntityAttribute(number.longValue());
        } else if (provinceObj instanceof String text && !text.isBlank()) {
            try {
                province = provinceCNConverter.convertToEntityAttribute(Long.valueOf(text.trim()));
            } catch (NumberFormatException ignored) {
                province = null;
            }
        }
        if (province == null) {
            return new SchoolScope(false, null, null);
        }
        return new SchoolScope(true, province, school);
    }

    private boolean sameSchool(ProvinceCN leftProvince, String leftSchool, ProvinceCN rightProvince, String rightSchool) {
        if (leftProvince == null || rightProvince == null) {
            return false;
        }
        if (leftSchool == null || rightSchool == null) {
            return false;
        }
        return leftProvince == rightProvince && leftSchool.trim().equals(rightSchool.trim());
    }

    private String normalizeAvatarUrl(Object avatarObj) {
        if (avatarObj == null) {
            return null;
        }
        String avatar = avatarObj.toString().trim();
        if (avatar.isEmpty()) {
            return null;
        }
        String lowerCaseAvatar = avatar.toLowerCase();
        // 统一为URL入库，禁止Data URI（base64）直接入库。
        if (lowerCaseAvatar.startsWith("data:image/")) {
            return null;
        }
        if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
            return avatar;
        }

        String baseUrl = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
        if (avatar.startsWith("/uploads/avatar/")) {
            return baseUrl + avatar;
        }
        if (avatar.startsWith("uploads/avatar/")) {
            return baseUrl + "/" + avatar;
        }
        // 非URL、非头像相对路径的值不入库。
        return null;
    }

    private record SchoolScope(boolean enabled, ProvinceCN schoolProvince, String school) {
    }
}

