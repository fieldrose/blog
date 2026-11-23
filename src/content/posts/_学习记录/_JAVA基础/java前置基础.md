---
author: Mimas
pubDatetime: 2026-11-09T00:00:00Z
modDatetime: 2026-11-18T00:00:00Z
title: "java前置基础"
slug: java前置基础
featured: false
draft: false
tags:
  - JAVA
series: JAVA
seriesOrder: 1
description: "java前置基础笔记"
---

## Table of Contents

## java前置基础笔记

### 版本及分类

- [java各版本发布详情](https://www.oracle.com/java/technologies/java-se-support-roadmap.html)
- java SE 标准版，支持面向桌面级应用的Java平台，提供完整的Java API库。也称为J2SE。
- java EE 企业版，开发企业环境下的一整套解决方案，技术体系中包含Servlet，JSP等，主要针对web应用开发。也称为J2EE。
- java ME 移动版，支持移动端应用的开发平台，对Java API进行了简化，并加入了对移动端的支持。也称为J2ME。已经被Android和iOS所取代。

### 重要特点

1. 面向对象(oop)。
2. 健壮性，强类型机制，异常处理，垃圾自动回收都是健壮性的保证。
3. 跨平台：体现在编译后的.class文件上，.class文件在不同平台上无需重复编译即可执行（依赖不同操作系统上的JVM）。
4. 解释型语言
   - 解释型语言：编译后的代码无法直接被计算机执行，需要通过解释器解释执行。如JavaScript，Java等。
   - 编译型语言：编译后的代码可以直接被计算机执行，不需要解释器。如C，C++等。

### java运行机制及运行过程

核心机制-Java虚拟机(JVM)

- JVM是虚拟计算机，具有指令集并使用不同的存储区域。负责执行指令，管理数据、内存、寄存器等，包含在JDK中。
- 对于不同的操作系统，JVM的实现不同，如Windows、Linux、macOS等都有自己的JVM实现。
- JVM屏蔽了底层运行平台的差别。

### JVM/JRE/JDK

- JVM：Java虚拟机，负责执行Java字节码。
- JRE：Java运行环境，包含JVM、Java SE核心类库。
- JDK：Java开发工具包，包含JRE、Java SE核心类库、Java开发工具（如javac、javadoc，javap等）。

对于编译后的java程序，需要在JRE或JDK中运行。

### 环境变量配置

JDK目录下的bin目录包含了Java开发工具，如javac、javadoc，javap等。

- 配置JDK环境变量：
  - 新建`JAVA_HOME`，指向JDK安装目录。
  - 编辑`PATH`，添加`%JAVA_HOME%\bin`。

windows系统下，环境变量分当前用户环境变量和系统环境变量。

- 当前用户环境变量：仅对当前用户生效。
- 系统环境变量：对所有用户生效。

两个环境变量在同一个作用域下配置即可。
