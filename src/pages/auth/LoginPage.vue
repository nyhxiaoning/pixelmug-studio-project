<template>
  <main class="login-page">
    <!-- 左侧插画区 -->
    <div class="login-visual">
      <div class="login-visual__inner">
        <img
          class="login-visual__img"
          src="../layouts/login-illustration.png.jpeg"
          alt=""
        />
        <div class="login-visual__overlay">
          <span class="login-visual__mark">G</span>
          <h2 class="login-visual__title">冒泡设备管理平台</h2>
          <p class="login-visual__subtitle">高效管理您的智能设备</p>
        </div>
      </div>
    </div>

    <!-- 右侧表单区 -->
    <div class="login-form-section">
      <div class="login-form-card">
        <h1 class="login-form-card__title">欢迎登录</h1>
        <p class="login-form-card__desc">请输入您的账号信息</p>

        <el-segmented
          v-model="loginType"
          :options="[
            { label: '验证码登录', value: 'CODE' },
            { label: '密码登录', value: 'PASSWORD' },
          ]"
          class="login-tabs"
        />
        <el-form ref="formRef" :model="form" :rules="rules" @keyup.enter="handleLogin">
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              :prefix-icon="User"
              placeholder="请输入手机号 / 邮箱"
              size="large"
            />
          </el-form-item>
          <el-form-item v-if="loginType === 'CODE'" prop="code">
            <el-input
              v-model="form.code"
              :prefix-icon="ChatDotRound"
              placeholder="请输入验证码"
              size="large"
            >
              <template #append>
                <el-button :disabled="codeButtonDisabled" :loading="sendingCode" @click="sendCode">
                  {{ codeButtonText }}
                </el-button>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item v-else prop="password">
            <el-input
              v-model="form.password"
              :prefix-icon="Lock"
              placeholder="请输入密码"
              show-password
              size="large"
              type="password"
            />
          </el-form-item>
          <el-button
            :loading="submitting"
            class="login-button"
            size="large"
            type="primary"
            @click="handleLogin"
          >
            {{ submitting ? '登录中...' : '登 录' }}
          </el-button>
        </el-form>

        <!-- 底部版权 + 语言切换 -->
        <div class="login-card-footer">
          <span class="login-card-footer__copyright">
            Copyright &copy; 2026 Bubble Tech. All Rights Reserved.
          </span>
          <el-select
            :model-value="currentLocale"
            :options="localeOptions"
            size="small"
            class="login-card-footer__lang-select"
            @change="handleLocaleChange"
          />
        </div>
      </div>
    </div>
  </main>
</template>

<script lang="ts" src="./login.ts"></script>
<style scoped lang="scss" src="./login.scss"></style>
