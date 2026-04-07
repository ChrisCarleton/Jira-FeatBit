<script setup lang="ts">
import { router } from '@forge/bridge';
import type { Environment, FlagRow } from '../types';

const props = defineProps<{
  flags: FlagRow[];
  environments: Environment[];
  portalUrl?: string;
  toggling?: Set<string>;
}>();

const emit = defineEmits<{
  toggle: [payload: { envId: string; flagKey: string; enable: boolean }];
}>();

function getEnvStatus(flag: FlagRow, envId: string): boolean | null {
  return flag.environments.find((e) => e.envId === envId)?.isEnabled ?? null;
}

function statusLabel(flag: FlagRow, envId: string): string {
  const s = getEnvStatus(flag, envId);
  if (s === null) return 'N/A';
  return s ? 'Enabled' : 'Disabled';
}

function statusClass(flag: FlagRow, envId: string): string {
  const s = getEnvStatus(flag, envId);
  if (s === null) return 'bg-[#2C333A] text-[#8C9BAB]';
  if (s) return 'bg-[#1C3329] text-[#4BCE97]';
  return 'bg-[#2C333A] text-[#626F86]';
}

function flagUrl(portalUrl: string, flagKey: string): string {
  return `${portalUrl.replace(/\/+$/, '')}/en/feature-flags/${flagKey}/targeting`;
}

function openFlag(portalUrl: string, flagKey: string): void {
  void router.open(flagUrl(portalUrl, flagKey));
}

function isToggling(flagKey: string, envId: string): boolean {
  return props.toggling?.has(`${envId}:${flagKey}`) ?? false;
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th
            class="text-left px-2.5 py-1.5 text-[11px] font-bold text-[#8C9BAB] uppercase tracking-wider border-b-2 border-[#454F59] whitespace-nowrap"
          >
            Flag
          </th>
          <th
            v-for="env in environments"
            :key="env.id"
            class="text-center px-2.5 py-1.5 text-[11px] font-bold text-[#8C9BAB] uppercase tracking-wider border-b-2 border-[#454F59] whitespace-nowrap"
          >
            {{ env.name }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="flag in flags" :key="flag.key">
          <td
            class="px-2.5 py-2 border-b border-[#2C333A] text-[#B6C2CF] align-middle"
          >
            <button
              v-if="portalUrl"
              @click="openFlag(portalUrl, flag.key)"
              class="block font-medium text-[#579DFF] hover:underline cursor-pointer bg-transparent border-0 p-0 text-left"
            >
              {{ flag.name }}
            </button>
            <span v-else class="block font-medium">{{ flag.name }}</span>
            <span class="font-mono text-[11px] text-[#8C9BAB]">{{
              flag.key
            }}</span>
          </td>
          <td
            v-for="env in environments"
            :key="env.id"
            class="px-2.5 py-2 border-b border-[#2C333A] text-center align-middle"
          >
            <span
              v-if="getEnvStatus(flag, env.id) === null"
              class="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#2C333A] text-[#8C9BAB]"
            >
              N/A
            </span>
            <button
              v-else
              :disabled="isToggling(flag.key, env.id)"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer border-0 transition-opacity"
              :class="[
                statusClass(flag, env.id),
                isToggling(flag.key, env.id)
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:opacity-80',
              ]"
              @click="
                emit('toggle', {
                  envId: env.id,
                  flagKey: flag.key,
                  enable: !getEnvStatus(flag, env.id),
                })
              "
            >
              <svg
                v-if="isToggling(flag.key, env.id)"
                class="animate-spin h-3 w-3"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                ></path>
              </svg>
              {{ statusLabel(flag, env.id) }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
