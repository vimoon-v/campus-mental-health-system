package com.ucaacp.backend.controller;

import com.ucaacp.backend.utils.return_object.ReturnObject;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.apache.catalina.connector.ClientAbortException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.validation.FieldError;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.io.EOFException;
import java.net.SocketException;
import java.util.HashMap;
import java.util.Map;


@RestControllerAdvice("com.ucaacp.backend.controller")
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * 处理请求体校验失败
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ReturnObject handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        return ReturnObject.fail(errors.toString());
    }

    /**
     * 处理路径变量或请求参数校验失败
     */
    @ExceptionHandler({ConstraintViolationException.class,jakarta.persistence.RollbackException.class,org.springframework.transaction.TransactionSystemException.class})
    public ReturnObject handleConstraintViolationExceptions(ConstraintViolationException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getConstraintViolations().forEach(violation -> {
            String fieldName = violation.getPropertyPath().toString();
            String errorMessage = violation.getMessage();
            errors.put(fieldName, errorMessage);
        });
        StringBuilder builder = new StringBuilder();
        for (Map.Entry<String, String> pairs : errors.entrySet()) {
            builder.append("参数").append(pairs.getKey()).append(":").append(pairs.getValue()).append("\r\n");
        }
        return ReturnObject.validationError(builder.toString());
    }

    /**
     * 客户端主动断开连接（刷新、跳转、取消请求）导致的写回异常
     */
    @ExceptionHandler({AsyncRequestNotUsableException.class, ClientAbortException.class, EOFException.class, SocketException.class})
    public void handleClientAbort(HttpServletRequest request, Exception ex) {
        log.debug("客户端已断开连接，忽略异常: method={}, uri={}, message={}",
                request.getMethod(),
                request.getRequestURI(),
                ex.getMessage());
    }


    /**
     * 处理未知异常
     */
    @ExceptionHandler(value = Throwable.class)
    public ReturnObject unknownExceptionHandler(HttpServletRequest request, Throwable e) {
        if (isClientAbortException(e)) {
            log.debug("客户端断连包装异常，忽略: method={}, uri={}, message={}",
                    request.getMethod(),
                    request.getRequestURI(),
                    e.getMessage());
            return null;
        }
        log.error("未处理异常: method={}, uri={}, message={}", request.getMethod(), request.getRequestURI(), e.getMessage(), e);
        return ReturnObject.error(e.getMessage());
    }

    private boolean isClientAbortException(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof AsyncRequestNotUsableException
                    || current instanceof ClientAbortException
                    || current instanceof EOFException
                    || current instanceof SocketException
                    || current instanceof ServletException) {
                String message = current.getMessage();
                if (message == null) {
                    return true;
                }
                String lower = message.toLowerCase();
                if (lower.contains("broken pipe")
                        || lower.contains("connection reset")
                        || message.contains("已建立的连接")
                        || message.contains("中止了一个已建立的连接")) {
                    return true;
                }
            }
            current = current.getCause();
        }
        return false;
    }

}
