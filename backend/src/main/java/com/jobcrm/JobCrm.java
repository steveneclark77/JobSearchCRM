package com.jobcrm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class JobCrm {
  public static void main(String[] args) {
    SpringApplication.run(JobCrm.class, args);
  }
}
