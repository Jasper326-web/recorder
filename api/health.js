export default function handler(_request, response) {
  response.status(200).json({
    ok: true,
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? '',
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? '',
    dashscope: {
      hasApiKey: Boolean(process.env.DASHSCOPE_API_KEY),
      baseUrl: process.env.DASHSCOPE_BASE_URL ?? 'https://dashscope.aliyuncs.com/api/v1',
      textModel: process.env.DASHSCOPE_MODEL ?? 'qwen3.6-plus',
      multimodalModel: process.env.DASHSCOPE_MULTIMODAL_MODEL ?? 'qwen3-vl-plus',
      mediaContextEnabled: process.env.DASHSCOPE_ENABLE_MEDIA_CONTEXT === 'true',
    },
    supabase: {
      hasUrl: Boolean(process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL),
      hasPublishableKey: Boolean(process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY),
    },
    checkedAt: new Date().toISOString(),
  })
}
