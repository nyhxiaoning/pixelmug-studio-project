<template>
  <main class="login-page">
    <div class="login-brand">
      <span class="login-brand__mark">G</span>
    </div>
    <section class="login-card">
      <h1>登录</h1>
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
            placeholder="请输入手机号/邮箱"
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
          登录
        </el-button>
      </el-form>
    </section>
  </main>
</template>

<script lang="ts" src="./login.ts"></script>
<style scoped lang="scss" src="./login.scss"></style>
