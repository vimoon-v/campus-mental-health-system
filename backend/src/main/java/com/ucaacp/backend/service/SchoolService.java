package com.ucaacp.backend.service;

import com.ucaacp.backend.repository.SchoolRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class SchoolService {

    @Autowired
    private SchoolRepository schoolRepository;

    public List<String> findSchoolsByProvinceName(String provinceName) {
        return schoolRepository.findSchoolNamesByProvinceName(provinceName);
    }
}
