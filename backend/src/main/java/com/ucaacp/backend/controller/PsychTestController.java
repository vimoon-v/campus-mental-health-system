package com.ucaacp.backend.controller;

import com.ucaacp.backend.annotation.CheckLogin;
import com.ucaacp.backend.entity.DTO.PsychAssessmentRecordDTO;
import com.ucaacp.backend.entity.PsychTestManage;
import com.ucaacp.backend.entity.PsychTestMeta;
import com.ucaacp.backend.entity.PsychTestOption;
import com.ucaacp.backend.entity.PsychTestQuestion;
import com.ucaacp.backend.entity.User;
import com.ucaacp.backend.entity.enums.UserRole;
import com.ucaacp.backend.repository.PsychTestManageSummary;
import com.ucaacp.backend.service.PsychTestManageService;
import com.ucaacp.backend.service.PsychTestService;
import com.ucaacp.backend.service.UserService;
import com.ucaacp.backend.utils.psychtest.classes.PsychTest;
import com.ucaacp.backend.utils.psychtest.classes.PsychTestAnswer;
import com.ucaacp.backend.utils.psychtest.classes.PsychTestResult;
import com.ucaacp.backend.utils.return_object.ReturnCode;
import com.ucaacp.backend.utils.return_object.ReturnObject;
import jakarta.servlet.http.HttpSession;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.lang.reflect.InvocationTargetException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/psych_test")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"}) // 开发环境使用
public class PsychTestController {

    @Autowired
    private PsychTestService psychTestService;

    @Autowired
    private UserService userService;

    @Autowired
    private PsychTestManageService psychTestManageService;

    private static final String MANAGE_PREFIX = "manage:";

    @CheckLogin
    @GetMapping("/get")
    public ReturnObject get(@RequestParam Map<String,Object> params, HttpSession session) throws Exception {

        String test=params.get("test").toString();
        Integer manageTestId = parseManageTestId(test);
        if (manageTestId != null) {
            Optional<PsychTestManage> optional = psychTestManageService.findById(manageTestId);
            if (optional.isEmpty()) {
                return ReturnObject.fail("测试不存在");
            }
            PsychTestManage manageTest = optional.get();
            User user = (User) session.getAttribute("user");
            boolean isTeacher = user != null && user.getRole() == UserRole.TEACHER;
            boolean isOwner = user != null && user.getUsername().equals(manageTest.getTeacherUsername());
            if (!"published".equalsIgnoreCase(manageTest.getStatus()) && !(isTeacher && isOwner)) {
                return ReturnObject.fail("测试未发布");
            }
            List<PsychTestQuestion> questions = psychTestManageService.listQuestions(manageTestId);
            List<ManagedQuestion> questionList = new ArrayList<>();
            int questionIndex = 1;
            for (PsychTestQuestion question : questions) {
                List<PsychTestOption> options = psychTestManageService.listOptions(question.getQuestionId());
                questionList.add(ManagedQuestion.from(questionIndex++, question, options));
            }
            ManagedPsychTest detail = ManagedPsychTest.from(manageTest, questionList);
            return ReturnObject.success(detail);
        }
        try {
            return ReturnObject.success(psychTestService.getPsychTestByClassName(test));
        }catch (ClassNotFoundException e){
            ReturnObject.fail("未知的测试名："+test);
        } catch (Exception e) {
            throw new Exception("类目解析错误",e);
        }
        return ReturnObject.fail();
    }

    @CheckLogin
    @GetMapping("/list_all")
    public ReturnObject list_all(@RequestParam Map<String,Object> params, HttpSession session) throws Exception {
        List<String> classNames = Arrays.asList(
                "ExampleTest",
                "AASTest",
                "CBCLTest",
                "CCSASTest",
                "DISCTest",
                "DSQTest",
                "ECRTest",
                "EMBUTest",
                "EPQTest",
                "FESCVTest",
                "IPPATest",
                "MMPITest",
                "RutterTest",
                "SarasonTest",
                "SASTest",
                "SCL90Test",
                "UPITest"
        );
        Map<String, PsychTestMeta> metaMap = psychTestService.findMetaByClassNames(classNames);
        Map<String, Long> participantMap = psychTestService.countByAssessmentClass();
        List<QueryListItem> testList = new ArrayList<>();
        for (String className : classNames) {
            PsychTest psychTest = psychTestService.getPsychTestByClassName(className);
            PsychTestMeta meta = metaMap.get(className);
            Long participants = participantMap.getOrDefault(className, 0L);
            testList.add(new QueryListItem(className, psychTest, meta, participants));
        }
        List<PsychTestManageSummary> manageSummaries = psychTestManageService.listSummaries();
        for (PsychTestManageSummary summary : manageSummaries) {
            if (summary == null || !"published".equalsIgnoreCase(summary.getStatus())) {
                continue;
            }
            QueryListItem item = new QueryListItem();
            item.setClassName(MANAGE_PREFIX + summary.getTestId());
            item.setTitle(summary.getTitle());
            item.setDescription(summary.getDescription());
            Integer questionCount = summary.getQuestionsNumber() == null ? 0 : summary.getQuestionsNumber().intValue();
            item.setQuestionsNumber(questionCount);
            item.setCategory(summary.getCategory());
            Integer duration = summary.getDurationMinutes();
            item.setDurationMinutes(duration != null ? duration : Math.max(5, (int) Math.round(questionCount * 0.5)));
            item.setRating(summary.getRating() == null ? 4.6 : summary.getRating().doubleValue());
            item.setParticipants(summary.getParticipants() == null ? 0L : summary.getParticipants().longValue());
            testList.add(item);
        }

        return ReturnObject.success(testList);
    }


    @CheckLogin
    @PostMapping("/answer")
    public ReturnObject answer(@RequestBody Map<String,Object> params, HttpSession session) throws Exception {

        String test=params.get("test").toString();
        Integer manageTestId = parseManageTestId(test);
        if (manageTestId != null) {
            Optional<PsychTestManage> optional = psychTestManageService.findById(manageTestId);
            if (optional.isEmpty()) {
                return ReturnObject.fail("测试不存在");
            }
            PsychTestManage manageTest = optional.get();
            if (!"published".equalsIgnoreCase(manageTest.getStatus())) {
                return ReturnObject.fail("测试未发布");
            }
            User user = (User) session.getAttribute("user");
            String username = user == null ? "" : user.getUsername();
            String assessmentClass = MANAGE_PREFIX + manageTestId;
            if (Boolean.FALSE.equals(manageTest.getAllowRepeat())
                    && psychTestService.hasRecord(assessmentClass, username)) {
                return ReturnObject.fail("该测试仅允许作答一次");
            }
            List<List<String>> answer = params.get("answer") == null ? new ArrayList<>() : (List<List<String>>) params.get("answer");
            List<PsychTestQuestion> questions = psychTestManageService.listQuestions(manageTestId);
            double totalScore = 0;
            double maxScore = 0;
            for (int i = 0; i < questions.size(); i++) {
                PsychTestQuestion question = questions.get(i);
                List<PsychTestOption> options = psychTestManageService.listOptions(question.getQuestionId());
                List<String> selectedKeys = (answer == null || i >= answer.size()) ? null : answer.get(i);
                totalScore += calculateQuestionScore(question.getType(), options, selectedKeys);
                maxScore += calculateQuestionMaxScore(question.getType(), options);
            }
            String report = buildScoreReport(totalScore, maxScore, manageTest.getCategory());
            psychTestService.record(assessmentClass, manageTest.getTitle(), username, report);
            Integer participants = manageTest.getParticipants();
            manageTest.setParticipants(participants == null ? 1 : participants + 1);
            psychTestManageService.save(manageTest);
            PsychTestResult result = new PsychTestResult();
            result.setMessage(report);
            return ReturnObject.success(result);
        }

        List<List<String>> answer= params.get("answer")==null?new ArrayList<>():(List<List<String>>) params.get("answer");
        PsychTest psychTest=psychTestService.getPsychTestByClassName(test);
        if(answer==null){
            ReturnObject.fail("回答为空");
        }
        PsychTestAnswer psychTestAnswer=new PsychTestAnswer(answer);
        PsychTestResult psychTestResult=psychTest.answer(psychTestAnswer);
        psychTestService.record(test,psychTest.getTitle(),((User)session.getAttribute("user")).getUsername(),psychTestResult.getMessage());
        return ReturnObject.success(psychTestResult);
    }

    private Integer parseManageTestId(String test) {
        if (test == null) {
            return null;
        }
        String value = test.trim();
        if (value.startsWith(MANAGE_PREFIX)) {
            String idPart = value.substring(MANAGE_PREFIX.length());
            try {
                return Integer.valueOf(idPart);
            } catch (NumberFormatException ex) {
                return null;
            }
        }
        return null;
    }

    private Integer parseOptionIndex(String key) {
        if (key == null) {
            return null;
        }
        try {
            return Integer.valueOf(key.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private double calculateQuestionScore(String type, List<PsychTestOption> options, List<String> selectedKeys) {
        if (options == null || options.isEmpty() || selectedKeys == null || selectedKeys.isEmpty()) {
            return 0;
        }
        String normalized = type == null ? "" : type.trim().toLowerCase();
        if ("fill".equals(normalized)) {
            return 0;
        }
        if ("multiple".equals(normalized)) {
            double sum = 0;
            for (String key : selectedKeys) {
                Integer keyIndex = parseOptionIndex(key);
                PsychTestOption option = resolveOption(options, keyIndex);
                if (option != null && option.getScore() != null) {
                    sum += option.getScore();
                }
            }
            return sum;
        }
        double maxSelected = 0;
        boolean selected = false;
        for (String key : selectedKeys) {
            Integer keyIndex = parseOptionIndex(key);
            PsychTestOption option = resolveOption(options, keyIndex);
            if (option != null && option.getScore() != null) {
                maxSelected = Math.max(maxSelected, option.getScore());
                selected = true;
            }
        }
        return selected ? maxSelected : 0;
    }

    private double calculateQuestionMaxScore(String type, List<PsychTestOption> options) {
        if (options == null || options.isEmpty()) {
            return 0;
        }
        String normalized = type == null ? "" : type.trim().toLowerCase();
        if ("fill".equals(normalized)) {
            return 0;
        }
        if ("multiple".equals(normalized)) {
            double sum = 0;
            for (PsychTestOption option : options) {
                if (option != null && option.getScore() != null) {
                    sum += option.getScore();
                }
            }
            return sum;
        }
        double max = 0;
        for (PsychTestOption option : options) {
            if (option != null && option.getScore() != null) {
                max = Math.max(max, option.getScore());
            }
        }
        return max;
    }

    private PsychTestOption resolveOption(List<PsychTestOption> options, Integer keyIndex) {
        if (keyIndex == null || keyIndex <= 0 || keyIndex > options.size()) {
            return null;
        }
        return options.get(keyIndex - 1);
    }

    private String buildScoreReport(double totalScore, double maxScore, String category) {
        int total = (int) Math.round(totalScore);
        int max = (int) Math.round(maxScore);
        double ratio = maxScore > 0 ? (totalScore / maxScore) : 0;
        ScoreLevel level = resolveScoreLevel(ratio);
        String conclusion = resolveConclusion(category, level);
        String scorePart = max > 0 ? ("得分：" + total + "/" + max) : ("得分：" + total);
        return scorePart + "，等级：" + level.label + "。结论：" + conclusion;
    }

    private ScoreLevel resolveScoreLevel(double ratio) {
        if (ratio >= 0.8) {
            return ScoreLevel.HIGH;
        }
        if (ratio >= 0.5) {
            return ScoreLevel.MEDIUM;
        }
        return ScoreLevel.LOW;
    }

    private String resolveConclusion(String category, ScoreLevel level) {
        String key = category == null ? "" : category.trim().toLowerCase();
        if ("anxiety".equals(key)) {
            return level.pick("焦虑水平较低，保持良好心态与作息。",
                    "出现一定焦虑反应，建议适度放松与情绪调节。",
                    "焦虑水平偏高，建议寻求老师或专业咨询支持。");
        }
        if ("depression".equals(key)) {
            return level.pick("情绪状态总体稳定，保持积极的生活节奏。",
                    "情绪有一定波动，建议关注作息与情绪管理。",
                    "情绪低落感明显，建议与老师或专业人士沟通。");
        }
        if ("stress".equals(key)) {
            return level.pick("压力水平较低，注意保持稳定节奏。",
                    "压力感中等，建议合理安排学习与休息。",
                    "压力偏高，建议尽快调整计划并寻求支持。");
        }
        if ("relationship".equals(key)) {
            return level.pick("人际互动总体顺畅，继续保持良好沟通。",
                    "人际关系存在一定压力，建议提升沟通与表达。",
                    "人际困扰较多，建议寻求辅导与支持。");
        }
        if ("study".equals(key) || "adaptation".equals(key)) {
            return level.pick("学习适应情况良好，继续保持。",
                    "学习压力与适应中等，建议优化方法与节奏。",
                    "学习适应困难较明显，建议及时调整与求助。");
        }
        if ("career".equals(key)) {
            return level.pick("职业规划意识清晰，继续保持探索。",
                    "职业规划有待完善，建议进一步了解自我与方向。",
                    "职业规划困惑较大，建议寻求指导与咨询。");
        }
        if ("emotion".equals(key)) {
            return level.pick("情绪状态良好，继续保持稳定习惯。",
                    "情绪有波动，建议关注压力来源并调节。",
                    "情绪困扰明显，建议寻求老师或专业支持。");
        }
        return level.pick("总体状态良好，保持健康作息与积极心态。",
                "状态一般，建议关注情绪与压力管理。",
                "状态偏紧张，建议寻求支持与帮助。");
    }

    private enum ScoreLevel {
        LOW("低"),
        MEDIUM("中"),
        HIGH("高");

        private final String label;

        ScoreLevel(String label) {
            this.label = label;
        }

        private String pick(String low, String medium, String high) {
            if (this == HIGH) {
                return high;
            }
            if (this == MEDIUM) {
                return medium;
            }
            return low;
        }
    }

    @CheckLogin
    @GetMapping("record/list_mine")
    public ReturnObject listMine(HttpSession session) throws Exception {

        String username=((User)session.getAttribute("user")).getUsername();

        List<PsychAssessmentRecordDTO> psychAssessmentRecordDTOList=psychTestService.findDTOByTestUsername(username);

        if(psychAssessmentRecordDTOList!=null){
            return ReturnObject.success(psychAssessmentRecordDTOList);
        }else{
            return ReturnObject.fail("获取失败");
        }
    }



    @Data
    public static class QueryListItem{
        private String className;
        private String title;
        private String description;
        private Integer questionsNumber;
        private String category;
        private Integer durationMinutes;
        private Double rating;
        private Long participants;

        public QueryListItem() {
        }

        public QueryListItem(String className, PsychTest psychTest, PsychTestMeta meta, Long participants) {
            this.className = className;
            this.title = psychTest.getTitle();
            this.description = psychTest.getDescription();
            this.questionsNumber = psychTest.getQuestions().size();
            this.category = meta != null && meta.getCategory() != null ? meta.getCategory() : "personality";
            Integer questionCount = this.questionsNumber != null ? this.questionsNumber : 10;
            this.durationMinutes = meta != null && meta.getDurationMinutes() != null
                    ? meta.getDurationMinutes()
                    : Math.max(5, (int) Math.round(questionCount * 0.5));
            BigDecimal ratingValue = meta != null ? meta.getRating() : null;
            this.rating = ratingValue != null ? ratingValue.doubleValue() : 4.6;
            this.participants = participants != null ? participants : 0L;
        }
    }

    @Data
    public static class ManagedPsychTest {
        private Integer id;
        private String title;
        private String description;
        private List<ManagedQuestion> questions;

        public static ManagedPsychTest from(PsychTestManage test, List<ManagedQuestion> questions) {
            ManagedPsychTest dto = new ManagedPsychTest();
            dto.setId(test.getTestId());
            dto.setTitle(test.getTitle());
            dto.setDescription(test.getDescription());
            dto.setQuestions(questions);
            return dto;
        }
    }

    @Data
    public static class ManagedQuestion {
        private Integer id;
        private String title;
        private String content;
        private boolean multiOptional;
        private List<ManagedOption> options;

        public static ManagedQuestion from(int index, PsychTestQuestion question, List<PsychTestOption> options) {
            ManagedQuestion dto = new ManagedQuestion();
            dto.setId(question.getQuestionId());
            dto.setTitle("第" + index + "题");
            dto.setContent(question.getTitle());
            dto.setMultiOptional("multiple".equalsIgnoreCase(question.getType()));
            List<ManagedOption> optionList = new ArrayList<>();
            int optionIndex = 1;
            for (PsychTestOption option : options) {
                ManagedOption item = new ManagedOption();
                item.setKey(String.valueOf(optionIndex++));
                item.setText(option.getLabel());
                item.setScore(option.getScore() == null ? 0 : option.getScore().floatValue());
                optionList.add(item);
            }
            dto.setOptions(optionList);
            return dto;
        }
    }

    @Data
    public static class ManagedOption {
        private String key;
        private String text;
        private float score;
    }
}

