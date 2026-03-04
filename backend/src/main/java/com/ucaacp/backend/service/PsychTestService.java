package com.ucaacp.backend.service;

import com.ucaacp.backend.entity.DTO.PsychAssessmentRecordDTO;
import com.ucaacp.backend.entity.PsychAssessmentRecord;
import com.ucaacp.backend.entity.PsychTestMeta;
import com.ucaacp.backend.repository.PsychAssessmentRepository;
import com.ucaacp.backend.repository.PsychTestMetaRepository;
import com.ucaacp.backend.utils.psychtest.classes.PsychTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.InvocationTargetException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class PsychTestService {


    @Autowired
    private PsychAssessmentRepository psychAssessmentRepository;

    @Autowired
    private PsychTestMetaRepository psychTestMetaRepository;

    public PsychTest getPsychTestByClassName(String className) throws ClassNotFoundException, NoSuchMethodException, InvocationTargetException, InstantiationException, IllegalAccessException {
        Class<?> clazz = Class.forName("com.ucaacp.backend.utils.psychtest.test." + className);
        return (PsychTest)clazz.getDeclaredConstructor().newInstance();
    }


    public void record(String assessmentClass, String assessmentName, String testUsername, String assessmentReport){
        PsychAssessmentRecord record = new PsychAssessmentRecord(assessmentClass, assessmentName, testUsername, assessmentReport);
        psychAssessmentRepository.save(record);
    }

    public List<PsychAssessmentRecordDTO> findDTOByTestUsername(String testUsername){
        return psychAssessmentRepository.findDTOByTestUsername(testUsername);
    }

    public Map<String, Long> countByAssessmentClass() {
        List<Object[]> rows = psychAssessmentRepository.countByAssessmentClass();
        Map<String, Long> result = new HashMap<>();
        if (rows == null) {
            return result;
        }
        for (Object[] row : rows) {
            if (row == null || row.length < 2 || row[0] == null) {
                continue;
            }
            Long count = row[1] instanceof Long ? (Long) row[1] : Long.parseLong(row[1].toString());
            result.put(row[0].toString(), count);
        }
        return result;
    }

    public Map<String, PsychTestMeta> findMetaByClassNames(List<String> classNames) {
        if (classNames == null || classNames.isEmpty()) {
            return new HashMap<>();
        }
        List<PsychTestMeta> metas = psychTestMetaRepository.findByClassNameIn(classNames);
        if (metas == null) {
            return new HashMap<>();
        }
        return metas.stream().collect(Collectors.toMap(PsychTestMeta::getClassName, meta -> meta));
    }

    public boolean hasRecord(String assessmentClass, String testUsername) {
        if (assessmentClass == null || testUsername == null || testUsername.isBlank()) {
            return false;
        }
        return psychAssessmentRepository.existsByAssessmentClassAndTestUsername(assessmentClass, testUsername);
    }

}
