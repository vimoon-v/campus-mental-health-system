package com.ucaacp.backend.controller;

import com.ucaacp.backend.entity.enums.ProvinceCN;
import com.ucaacp.backend.service.SchoolService;
import com.ucaacp.backend.utils.return_object.ReturnObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/school")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class SchoolController {

    @Autowired
    private SchoolService schoolService;

    @GetMapping("list")
    public ReturnObject listByProvince(@RequestParam Map<String, String> params) {
        String provinceCode = params.get("provinceCode");
        String provinceName = params.get("provinceName");

        if ((provinceCode == null || provinceCode.isEmpty()) && (provinceName == null || provinceName.isEmpty())) {
            return ReturnObject.fail("请选择学校所在省份");
        }

        if (provinceName == null || provinceName.isEmpty()) {
            try {
                ProvinceCN province = ProvinceCN.getByCode(Long.valueOf(provinceCode));
                if (province == null) {
                    return ReturnObject.fail("学校所在省份错误");
                }
                provinceName = province.getChineseName();
            } catch (NumberFormatException exception) {
                return ReturnObject.fail("学校所在省份错误");
            }
        }

        List<String> schools = schoolService.findSchoolsByProvinceName(provinceName);
        if (schools != null) {
            return ReturnObject.success(schools);
        }
        return ReturnObject.fail("获取学校失败");
    }
}

