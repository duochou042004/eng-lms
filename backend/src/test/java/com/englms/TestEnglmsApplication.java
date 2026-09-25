package com.englms;

import org.springframework.boot.SpringApplication;

public class TestEnglmsApplication {

	public static void main(String[] args) {
		SpringApplication.from(EnglmsApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
