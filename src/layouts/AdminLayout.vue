<script lang="ts" src="./admin-layout.ts"></script>

<template>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <div class="admin-brand">
        <img class="brand-logo" src="./login-illustration.png.jpeg" alt="冒泡设备管理平台" />
        <span>冒泡设备管理平台</span>
      </div>

      <template v-for="item in menu" :key="isMenuGroup(item) ? item.title : item.path">
        <div
          v-if="isMenuGroup(item)"
          class="sidebar-group"
          :class="{ active: isGroupActive(item) }"
        >
          <button
            class="sidebar-group-title"
            type="button"
            :aria-expanded="isGroupExpanded(item)"
            @click="toggleGroup(item)"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.title }}22</span>
            <span class="sidebar-group-arrow" :class="{ expanded: isGroupExpanded(item) }" />
          </button>
          <div v-show="isGroupExpanded(item)" class="sidebar-group-children">
            <router-link
              v-for="child in item.children"
              :key="child.path"
              class="sidebar-link sidebar-link--child"
              :class="{ active: isActive(child) }"
              :to="child.path"
            >
              <span>{{ child.title }}</span>
            </router-link>
          </div>
        </div>
        <router-link
          v-else
          class="sidebar-link"
          :class="{ active: isActive(item) }"
          :to="item.path"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.title }}</span>
        </router-link>
      </template>
    </aside>

    <section class="admin-main">
      <header class="admin-header">
        <div />
        <div class="header-right">
          <el-dropdown @command="handleUserCommand">
            <span class="user-entry">
              <el-avatar :size="28">T</el-avatar>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout"> 退出登录 </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="admin-content">
        <router-view />
      </main>
    </section>
  </div>
</template>

<style src="./admin-layout.scss" lang="scss"></style>
