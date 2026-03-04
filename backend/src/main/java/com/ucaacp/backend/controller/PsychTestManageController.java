package com.ucaacp.backend.controller;

import com.ucaacp.backend.annotation.CheckLogin;
import com.ucaacp.backend.annotation.CheckUserRole;
import com.ucaacp.backend.entity.PsychTestManage;
import com.ucaacp.backend.entity.PsychTestOption;
import com.ucaacp.backend.entity.PsychTestQuestion;
import com.ucaacp.backend.entity.User;
import com.ucaacp.backend.entity.enums.UserRole;
import com.ucaacp.backend.repository.PsychTestManageSummary;
import com.ucaacp.backend.service.PsychTestManageService;
import com.ucaacp.backend.utils.return_object.ReturnObject;
import jakarta.servlet.http.HttpSession;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/psych_test/manage")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class PsychTestManageController {

    @Autowired
    private PsychTestManageService psychTestManageService;

    private static final List<String> ALLOWED_STATUSES = List.of("draft", "published", "archived");
    private static final List<String> ALLOWED_TYPES = List.of("single", "multiple", "scale", "fill");
    private static final List<String> ALLOWED_GRADE_SCOPES = List.of("all", "freshman", "sophomore", "junior", "senior");

    @CheckLogin
    @CheckUserRole({UserRole.TEACHER})
    @GetMapping("/list")
    public ReturnObject list(@RequestParam Map<String, Object> params, HttpSession session) {
        String keyword = params.get("keyword") == null ? "" : params.get("keyword").toString().trim().toLowerCase();
        String status = params.get("status") == null ? "all" : params.get("status").toString().trim().toLowerCase();
        String category = params.get("category") == null ? "all" : params.get("category").toString().trim().toLowerCase();
        String gradeScope = params.get("gradeScope") == null ? "all" : params.get("gradeScope").toString().trim().toLowerCase();
        final String statusFilter = status.isBlank() ? "all" : status;
        final String categoryFilter = category.isBlank() ? "all" : category;
        final String gradeScopeFilter = gradeScope.isBlank() ? "all" : gradeScope;
        final String keywordFilter = keyword;

        List<PsychTestManageSummary> summaries = psychTestManageService.listSummaries();
        List<ManageTestListItem> result = summaries.stream()
                .filter(item -> "all".equals(statusFilter) || statusFilter.equalsIgnoreCase(item.getStatus()))
                .filter(item -> "all".equals(categoryFilter) || categoryFilter.equalsIgnoreCase(item.getCategory()))
                .filter(item -> "all".equals(gradeScopeFilter) || gradeScopeFilter.equalsIgnoreCase(item.getGradeScope()))
                .filter(item -> {
                    if (keywordFilter.isEmpty()) {
                        return true;
                    }
                    String haystack = ((item.getTitle() == null ? "" : item.getTitle()) + " " +
                            (item.getDescription() == null ? "" : item.getDescription())).toLowerCase();
                    return haystack.contains(keywordFilter);
                })
                .map(ManageTestListItem::fromSummary)
                .collect(Collectors.toList());
        return ReturnObject.success(result);
    }

    @CheckLogin
    @CheckUserRole({UserRole.TEACHER})
    @GetMapping("/detail")
    public ReturnObject detail(@RequestParam Map<String, Object> params, HttpSession session) {
        Object testIdObj = params.get("testId");
        if (testIdObj == null) {
            return ReturnObject.fail("缺少testId");
        }
        Integer testId = Integer.valueOf(testIdObj.toString());
        Optional<PsychTestManage> optional = psychTestManageService.findById(testId);
        if (optional.isEmpty()) {
            return ReturnObject.fail("测试不存在");
        }
        PsychTestManage test = optional.get();
        List<PsychTestQuestion> questions = psychTestManageService.listQuestions(testId);
        List<ManageQuestion> questionList = new ArrayList<>();
        for (PsychTestQuestion question : questions) {
            List<PsychTestOption> options = psychTestManageService.listOptions(question.getQuestionId());
            questionList.add(ManageQuestion.from(question, options));
        }
        ManageTestDetail detail = ManageTestDetail.from(test, questionList);
        return ReturnObject.success(detail);
    }

    @CheckLogin
    @CheckUserRole({UserRole.TEACHER})
    @PostMapping("/create")
    public ReturnObject create(@RequestBody ManageTestRequest request, HttpSession session) {
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ReturnObject.fail("用户未登录");
        }
        PsychTestManage test = new PsychTestManage();
        test.setTitle(request.getTitle() == null || request.getTitle().isBlank() ? "未命名心理测试" : request.getTitle());
        test.setDescription(request.getDescription());
        test.setCategory(normalizeCategory(request.getCategory()));
        test.setGradeScope(normalizeGradeScope(request.getGradeScope()));
        test.setDurationMinutes(request.getDurationMinutes());
        test.setAllowRepeat(request.getAllowRepeat() != null ? request.getAllowRepeat() : Boolean.TRUE);
        test.setShowResult(request.getShowResult() != null ? request.getShowResult() : Boolean.TRUE);
        test.setAutoWarn(request.getAutoWarn() != null ? request.getAutoWarn() : Boolean.TRUE);
        test.setStatus(normalizeStatus(request.getStatus()));
        test.setTeacherUsername(user.getUsername());
        test.setValidFrom(parseDate(request.getValidFrom()));
        test.setValidTo(parseDate(request.getValidTo()));
        test.setPassRate(normalizePassRate(request.getPassRate()));
        test.setRating(request.getRating());
        if ("published".equals(test.getStatus())) {
            test.setPublishTime(LocalDateTime.now());
        }
        PsychTestManage saved = psychTestManageService.save(test);
        Map<String, Object> data = new HashMap<>();
        data.put("testId", saved.getTestId());
        return ReturnObject.success(data);
    }

    @CheckLogin
    @CheckUserRole({UserRole.TEACHER})
    @PostMapping("/update")
    public ReturnObject update(@RequestBody ManageTestUpdateRequest request, HttpSession session) {
        if (request.getTestId() == null) {
            return ReturnObject.fail("缺少testId");
        }
        Optional<PsychTestManage> optional = psychTestManageService.findById(request.getTestId());
        if (optional.isEmpty()) {
            return ReturnObject.fail("测试不存在");
        }
        PsychTestManage test = optional.get();
        if (request.getTitle() != null) {
            test.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            test.setDescription(request.getDescription());
        }
        if (request.getCategory() != null) {
            test.setCategory(normalizeCategory(request.getCategory()));
        }
        if (request.getGradeScope() != null) {
            test.setGradeScope(normalizeGradeScope(request.getGradeScope()));
        }
        if (request.getDurationMinutes() != null) {
            test.setDurationMinutes(request.getDurationMinutes());
        }
        if (request.getAllowRepeat() != null) {
            test.setAllowRepeat(request.getAllowRepeat());
        }
        if (request.getShowResult() != null) {
            test.setShowResult(request.getShowResult());
        }
        if (request.getAutoWarn() != null) {
            test.setAutoWarn(request.getAutoWarn());
        }
        if (request.getStatus() != null) {
            String nextStatus = normalizeStatus(request.getStatus());
            test.setStatus(nextStatus);
            if ("published".equals(nextStatus) && test.getPublishTime() == null) {
                test.setPublishTime(LocalDateTime.now());
            }
        }
        if (request.getValidFrom() != null) {
            test.setValidFrom(parseDate(request.getValidFrom()));
        }
        if (request.getValidTo() != null) {
            test.setValidTo(parseDate(request.getValidTo()));
        }
        if (request.getPassRate() != null) {
            test.setPassRate(normalizePassRate(request.getPassRate()));
        }
        if (request.getRating() != null) {
            test.setRating(request.getRating());
        }
        psychTestManageService.save(test);
        return ReturnObject.success();
    }

    @CheckLogin
    @CheckUserRole({UserRole.TEACHER})
    @PostMapping("/publish")
    public ReturnObject publish(@RequestBody Map<String, Object> params, HttpSession session) {
        return updateStatus(params, "published");
    }

    @CheckLogin
    @CheckUserRole({UserRole.TEACHER})
    @PostMapping("/archive")
    public ReturnObject archive(@RequestBody Map<String, Object> params, HttpSession session) {
        return updateStatus(params, "archived");
    }

    @CheckLogin
    @CheckUserRole({UserRole.TEACHER})
    @PostMapping("/draft")
    public ReturnObject draft(@RequestBody Map<String, Object> params, HttpSession session) {
        return updateStatus(params, "draft");
    }

    private ReturnObject updateStatus(Map<String, Object> params, String status) {
        Object testIdObj = params.get("testId");
        if (testIdObj == null) {
            return ReturnObject.fail("缺少testId");
        }
        Integer testId = Integer.valueOf(testIdObj.toString());
        Optional<PsychTestManage> optional = psychTestManageService.findById(testId);
        if (optional.isEmpty()) {
            return ReturnObject.fail("测试不存在");
        }
        PsychTestManage test = optional.get();
        test.setStatus(status);
        if ("published".equals(status)) {
            test.setPublishTime(LocalDateTime.now());
        }
        psychTestManageService.save(test);
        return ReturnObject.success();
    }

    @CheckLogin
    @CheckUserRole({UserRole.TEACHER})
    @PostMapping("/delete")
    public ReturnObject delete(@RequestBody Map<String, Object> params, HttpSession session) {
        Object testIdObj = params.get("testId");
        if (testIdObj == null) {
            return ReturnObject.fail("缺少testId");
        }
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return ReturnObject.fail("用户未登录");
        }
        Integer testId = Integer.valueOf(testIdObj.toString());
        Optional<PsychTestManage> optional = psychTestManageService.findById(testId);
        if (optional.isEmpty()) {
            return ReturnObject.fail("测试不存在");
        }
        PsychTestManage test = optional.get();
        if (!user.getUsername().equals(test.getTeacherUsername())) {
            return ReturnObject.fail("无权删除该测试");
        }
        boolean ok = psychTestManageService.deleteById(testId);
        return ok ? ReturnObject.success() : ReturnObject.fail("删除失败");
    }

    @CheckLogin
    @CheckUserRole({UserRole.TEACHER})
    @PostMapping("/question/add")
    public ReturnObject addQuestion(@RequestBody ManageQuestionRequest request, HttpSession session) {
        if (request.getTestId() == null) {
            return ReturnObject.fail("缺少testId");
        }
        Optional<PsychTestManage> optional = psychTestManageService.findById(request.getTestId());
        if (optional.isEmpty()) {
            return ReturnObject.fail("测试不存在");
        }
        PsychTestQuestion question = new PsychTestQuestion();
        question.setTitle(request.getTitle() == null ? "" : request.getTitle());
        question.setType(normalizeType(request.getType()));
        List<PsychTestOption> options = convertOptions(request.getOptions());
        PsychTestQuestion saved = psychTestManageService.addQuestion(request.getTestId(), question, options);
        return ReturnObject.success(Map.of("questionId", saved.getQuestionId()));
    }

    @CheckLogin
    @CheckUserRole({UserRole.TEACHER})
    @PostMapping("/question/update")
    public ReturnObject updateQuestion(@RequestBody ManageQuestionUpdateRequest request, HttpSession session) {
        if (request.getQuestionId() == null) {
            return ReturnObject.fail("缺少questionId");
        }
        List<PsychTestOption> options = request.getOptions() == null ? null : convertOptions(request.getOptions());
        String nextType = request.getType() == null ? null : normalizeType(request.getType());
        Optional<PsychTestQuestion> optional = psychTestManageService.updateQuestion(
                request.getQuestionId(),
                request.getTitle(),
                nextType,
                options
        );
        if (optional.isEmpty()) {
            return ReturnObject.fail("题目不存在");
        }
        return ReturnObject.success();
    }

    @CheckLogin
    @CheckUserRole({UserRole.TEACHER})
    @PostMapping("/question/delete")
    public ReturnObject deleteQuestion(@RequestBody Map<String, Object> params, HttpSession session) {
        Object questionIdObj = params.get("questionId");
        if (questionIdObj == null) {
            return ReturnObject.fail("缺少questionId");
        }
        Integer questionId = Integer.valueOf(questionIdObj.toString());
        boolean ok = psychTestManageService.deleteQuestion(questionId);
        return ok ? ReturnObject.success() : ReturnObject.fail("题目不存在");
    }

    @CheckLogin
    @CheckUserRole({UserRole.TEACHER})
    @PostMapping("/question/reorder")
    public ReturnObject reorderQuestions(@RequestBody ManageQuestionReorderRequest request, HttpSession session) {
        if (request.getTestId() == null || request.getQuestionIds() == null) {
            return ReturnObject.fail("缺少参数");
        }
        psychTestManageService.reorderQuestions(request.getTestId(), request.getQuestionIds());
        return ReturnObject.success();
    }

    @CheckLogin
    @CheckUserRole({UserRole.TEACHER})
    @GetMapping("/export")
    public ReturnObject export(@RequestParam Map<String, Object> params, HttpSession session) {
        List<PsychTestManageSummary> summaries = psychTestManageService.listSummaries();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (PsychTestManageSummary summary : summaries) {
            Map<String, Object> row = new HashMap<>();
            row.put("testId", summary.getTestId());
            row.put("title", summary.getTitle());
            row.put("category", summary.getCategory());
            row.put("gradeScope", summary.getGradeScope());
            row.put("status", summary.getStatus());
            row.put("questionsNumber", summary.getQuestionsNumber());
            row.put("participants", summary.getParticipants());
            row.put("durationMinutes", summary.getDurationMinutes());
            row.put("passRate", summary.getPassRate());
            row.put("rating", summary.getRating());
            row.put("createdAt", summary.getCreatedAt());
            row.put("publishTime", summary.getPublishTime());
            rows.add(row);
        }
        return ReturnObject.success(rows);
    }

    private List<PsychTestOption> convertOptions(List<ManageOption> options) {
        if (options == null) {
            return new ArrayList<>();
        }
        List<PsychTestOption> result = new ArrayList<>();
        for (int i = 0; i < options.size(); i++) {
            ManageOption option = options.get(i);
            PsychTestOption entity = new PsychTestOption();
            entity.setLabel(option.getLabel() == null ? "" : option.getLabel());
            entity.setScore(option.getScore());
            entity.setOrderIndex(option.getOrderIndex() != null ? option.getOrderIndex() : (i + 1));
            result.add(entity);
        }
        return result;
    }

    private String normalizeStatus(String status) {
        if (status == null) {
            return "draft";
        }
        String normalized = status.trim().toLowerCase();
        return ALLOWED_STATUSES.contains(normalized) ? normalized : "draft";
    }

    private String normalizeCategory(String category) {
        if (category == null || category.isBlank()) {
            return "personality";
        }
        return category.trim().toLowerCase();
    }

    private String normalizeGradeScope(String gradeScope) {
        if (gradeScope == null || gradeScope.isBlank()) {
            return "all";
        }
        String normalized = gradeScope.trim().toLowerCase();
        return ALLOWED_GRADE_SCOPES.contains(normalized) ? normalized : "all";
    }

    private BigDecimal normalizePassRate(BigDecimal passRate) {
        if (passRate == null) {
            return null;
        }
        if (passRate.compareTo(BigDecimal.ZERO) < 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal max = BigDecimal.valueOf(100);
        if (passRate.compareTo(max) > 0) {
            return max;
        }
        return passRate;
    }

    private String normalizeType(String type) {
        if (type == null) {
            return "single";
        }
        String normalized = type.trim().toLowerCase();
        return ALLOWED_TYPES.contains(normalized) ? normalized : "single";
    }

    private LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(raw);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    @Data
    public static class ManageTestListItem {
        private Integer testId;
        private String title;
        private String description;
        private String category;
        private String gradeScope;
        private String status;
        private Integer questionsNumber;
        private Integer participants;
        private Integer durationMinutes;
        private Double passRate;
        private Double rating;
        private LocalDateTime createdAt;
        private LocalDateTime publishTime;

        public static ManageTestListItem fromSummary(PsychTestManageSummary summary) {
            ManageTestListItem item = new ManageTestListItem();
            item.setTestId(summary.getTestId());
            item.setTitle(summary.getTitle());
            item.setDescription(summary.getDescription());
            item.setCategory(summary.getCategory());
            item.setGradeScope(summary.getGradeScope());
            item.setStatus(summary.getStatus());
            item.setQuestionsNumber(summary.getQuestionsNumber() != null ? summary.getQuestionsNumber().intValue() : 0);
            item.setParticipants(summary.getParticipants() != null ? summary.getParticipants() : 0);
            item.setDurationMinutes(summary.getDurationMinutes());
            item.setPassRate(summary.getPassRate() == null ? null : summary.getPassRate().doubleValue());
            item.setRating(summary.getRating() == null ? 4.6 : summary.getRating().doubleValue());
            item.setCreatedAt(summary.getCreatedAt());
            item.setPublishTime(summary.getPublishTime());
            return item;
        }
    }

    @Data
    public static class ManageTestDetail {
        private Integer testId;
        private String title;
        private String description;
        private String category;
        private String gradeScope;
        private String status;
        private Integer durationMinutes;
        private Boolean allowRepeat;
        private Boolean showResult;
        private Boolean autoWarn;
        private LocalDate validFrom;
        private LocalDate validTo;
        private Integer participants;
        private Double passRate;
        private Double rating;
        private LocalDateTime createdAt;
        private LocalDateTime publishTime;
        private List<ManageQuestion> questions;

        public static ManageTestDetail from(PsychTestManage test, List<ManageQuestion> questions) {
            ManageTestDetail detail = new ManageTestDetail();
            detail.setTestId(test.getTestId());
            detail.setTitle(test.getTitle());
            detail.setDescription(test.getDescription());
            detail.setCategory(test.getCategory());
            detail.setGradeScope(test.getGradeScope());
            detail.setStatus(test.getStatus());
            detail.setDurationMinutes(test.getDurationMinutes());
            detail.setAllowRepeat(test.getAllowRepeat());
            detail.setShowResult(test.getShowResult());
            detail.setAutoWarn(test.getAutoWarn());
            detail.setValidFrom(test.getValidFrom());
            detail.setValidTo(test.getValidTo());
            detail.setParticipants(test.getParticipants());
            detail.setPassRate(test.getPassRate() == null ? null : test.getPassRate().doubleValue());
            detail.setRating(test.getRating() == null ? 4.6 : test.getRating().doubleValue());
            detail.setCreatedAt(test.getCreatedAt());
            detail.setPublishTime(test.getPublishTime());
            detail.setQuestions(questions);
            return detail;
        }
    }

    @Data
    public static class ManageQuestion {
        private Integer questionId;
        private Integer testId;
        private String title;
        private String type;
        private Integer orderIndex;
        private List<ManageOption> options;

        public static ManageQuestion from(PsychTestQuestion question, List<PsychTestOption> options) {
            ManageQuestion dto = new ManageQuestion();
            dto.setQuestionId(question.getQuestionId());
            dto.setTestId(question.getTestId());
            dto.setTitle(question.getTitle());
            dto.setType(question.getType());
            dto.setOrderIndex(question.getOrderIndex());
            List<ManageOption> optionList = new ArrayList<>();
            for (PsychTestOption option : options) {
                ManageOption item = new ManageOption();
                item.setOptionId(option.getOptionId());
                item.setLabel(option.getLabel());
                item.setScore(option.getScore());
                item.setOrderIndex(option.getOrderIndex());
                optionList.add(item);
            }
            dto.setOptions(optionList);
            return dto;
        }
    }

    @Data
    public static class ManageOption {
        private Integer optionId;
        private String label;
        private Integer score;
        private Integer orderIndex;
    }

    @Data
    public static class ManageTestRequest {
        private String title;
        private String description;
        private String category;
        private String gradeScope;
        private Integer durationMinutes;
        private Boolean allowRepeat;
        private Boolean showResult;
        private Boolean autoWarn;
        private String status;
        private String validFrom;
        private String validTo;
        private BigDecimal passRate;
        private BigDecimal rating;
    }

    @Data
    public static class ManageTestUpdateRequest {
        private Integer testId;
        private String title;
        private String description;
        private String category;
        private String gradeScope;
        private Integer durationMinutes;
        private Boolean allowRepeat;
        private Boolean showResult;
        private Boolean autoWarn;
        private String status;
        private String validFrom;
        private String validTo;
        private BigDecimal passRate;
        private BigDecimal rating;
    }

    @Data
    public static class ManageQuestionRequest {
        private Integer testId;
        private String title;
        private String type;
        private List<ManageOption> options;
    }

    @Data
    public static class ManageQuestionUpdateRequest {
        private Integer questionId;
        private String title;
        private String type;
        private List<ManageOption> options;
    }

    @Data
    public static class ManageQuestionReorderRequest {
        private Integer testId;
        private List<Integer> questionIds;
    }
}

