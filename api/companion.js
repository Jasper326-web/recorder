const dashscopeBaseUrl = process.env.DASHSCOPE_BASE_URL ?? 'https://dashscope.aliyuncs.com/api/v1'
const dashscopeEndpoint = '/services/aigc/multimodal-generation/generation'
const maxEntries = 500
const maxDiaryContextLength = 28000
const maxRecentMessages = 12

const personaPrompts = {
  gentle: {
    name: '温柔小蜜',
    style: '语气温暖、柔软、陪伴感强。先确认用户的感受，再轻轻指出一个可能的模式，最后只给一个很小的下一步。',
  },
  coach: {
    name: '清醒教练',
    style: '语气清醒、直接、行动导向。把回答拆成事实、模式、风险和下一步，不绕弯，但保持尊重。',
  },
  poet: {
    name: '诗意朋友',
    style: '语气细腻、有画面感、像懂用户的朋友。可以使用少量比喻，但不要空泛抒情，要落回具体生活。',
  },
  strategist: {
    name: '战略参谋',
    style: '语气理性、结构化、擅长归纳。优先给判断框架、优先级、选择分支和可执行方案。',
  },
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    response.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const dashscopeApiKey = process.env.DASHSCOPE_API_KEY
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY

    if (!dashscopeApiKey) {
      response.status(500).json({ error: '还没有配置 DASHSCOPE_API_KEY。' })
      return
    }

    if (!supabaseUrl || !supabaseKey) {
      response.status(500).json({ error: '还没有配置 Supabase URL 或 publishable key。' })
      return
    }

    const accessToken = readBearerToken(request.headers.authorization)
    if (!accessToken) {
      response.status(401).json({ error: '请先登录，再和心灵小蜜对话。' })
      return
    }

    const body = await readJsonBody(request)
    const messages = Array.isArray(body.messages) ? body.messages : []
    const persona = personaPrompts[body.personaId] ?? personaPrompts.gentle
    const latestUserMessage = messages.filter((message) => message?.role === 'user').at(-1)?.content?.trim()

    if (!latestUserMessage) {
      response.status(400).json({ error: '请输入想问心灵小蜜的问题。' })
      return
    }

    const entries = await fetchDiaryEntries({ supabaseUrl, supabaseKey, accessToken })
    const diaryContext = buildDiaryContext(entries)
    const dashscopePayload = await callDashscopeTextOnly({
      apiKey: dashscopeApiKey,
      diaryContext,
      messages,
      persona,
    })
    const reply = readDashscopeReply(dashscopePayload)

    if (!reply) {
      response.status(502).json({ error: 'AI 没有返回有效内容。' })
      return
    }

    await saveCompanionMessage({ supabaseUrl, supabaseKey, accessToken, role: 'user', content: latestUserMessage })
    await saveCompanionMessage({ supabaseUrl, supabaseKey, accessToken, role: 'assistant', content: reply })

    response.status(200).json({
      reply,
      diaryCount: entries.length,
    })
  } catch (error) {
    response.status(error?.statusCode ?? 500).json({
      error: error instanceof Error ? error.message : '心灵小蜜出错了。',
    })
  }
}

async function callDashscopeTextOnly({ apiKey, diaryContext, messages, persona }) {
  const result = await fetch(`${dashscopeBaseUrl}${dashscopeEndpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.DASHSCOPE_MODEL ?? 'qwen-plus',
      input: {
        messages: buildModelMessages({ diaryContext, messages, persona }),
      },
      parameters: {
        result_format: 'message',
      },
    }),
  })
  const payload = await result.json().catch(() => null)

  if (!result.ok) {
    const error = new Error(readDashscopeError(payload))
    error.statusCode = 502
    throw error
  }

  return payload
}

function readBearerToken(authorization) {
  if (!authorization?.startsWith('Bearer ')) return ''
  return authorization.slice('Bearer '.length).trim()
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === 'object') return request.body
  if (typeof request.body === 'string') return JSON.parse(request.body)

  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  if (chunks.length === 0) return {}

  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

async function fetchDiaryEntries({ supabaseUrl, supabaseKey, accessToken }) {
  const url = new URL('/rest/v1/entries', supabaseUrl)
  url.searchParams.set('select', 'created_at,type,prompt_answers,body_text,title,category,tags,ai_summary,ai_reflection')
  url.searchParams.set('order', 'created_at.desc')
  url.searchParams.set('limit', String(maxEntries))

  const result = await fetch(url, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const payload = await result.json().catch(() => null)
  if (!result.ok) {
    throw new Error(payload?.message ?? '读取 Supabase 日记失败。')
  }

  return Array.isArray(payload) ? payload : []
}

async function saveCompanionMessage({ supabaseUrl, supabaseKey, accessToken, role, content }) {
  const url = new URL('/rest/v1/companion_messages', supabaseUrl)
  const result = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ role, content }),
  })

  if (!result.ok) {
    console.warn('Failed to save companion message', await result.text().catch(() => ''))
  }
}

function buildDiaryContext(entries) {
  if (entries.length === 0) {
    return '用户的 Supabase 日记库目前还没有记录。'
  }

  const lines = entries.map((entry, index) => {
    const answers = entry.prompt_answers ?? {}
    const tags = Array.isArray(entry.tags) ? entry.tags.join('、') : ''

    return [
      `#${index + 1} ${formatDate(entry.created_at)} ${formatEntryType(entry.type)}`,
      `标题：${entry.title ?? ''}`,
      `训练目标：${entry.category ?? ''}`,
      tags ? `标签：${tags}` : '',
      answers.state ? `当时状态：${answers.state}` : '',
      answers.event ? `发生了什么：${answers.event}` : '',
      answers.next ? `下一步：${answers.next}` : '',
      entry.body_text ? `正文：${entry.body_text}` : '',
      entry.ai_summary ? `已有摘要：${entry.ai_summary}` : '',
      entry.ai_reflection ? `已有回应：${entry.ai_reflection}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  })

  const context = lines.join('\n\n')

  if (context.length <= maxDiaryContextLength) return context
  return `${context.slice(0, maxDiaryContextLength)}\n\n[系统提示：日记内容较多，以上是按时间倒序截取的最近部分。]`
}

function buildModelMessages({ diaryContext, messages, persona }) {
  const recentMessages = messages
    .filter((message) => ['user', 'assistant'].includes(message?.role) && typeof message.content === 'string')
    .slice(-maxRecentMessages)
    .map((message) => ({
      role: message.role,
      content: [{ text: message.content.slice(0, 4000) }],
    }))

  return [
    {
      role: 'system',
      content: [{ text: buildSystemPrompt(persona) }],
    },
    {
      role: 'user',
      content: [
        {
          text: [
            '以下是用户的日记文字上下文，按时间倒序排列：',
            diaryContext,
            '当前版本只支持文字输入。对于音频或视频记录，你只能使用标题、分类、标签和已有摘要，不要假装听过或看过原文件。',
          ].join('\n'),
        },
      ],
    },
    ...recentMessages,
  ]
}

function buildSystemPrompt(persona) {
  return [
    `你是“心灵小蜜”的一个角色形象：「${persona.name}」。`,
    persona.style,
    '你本质上是一个温暖、清醒、具体的个人记录分析聊天助手。',
    '你可以基于用户 Supabase 日记库中的文字记录、标题、分类、标签和摘要回答问题，帮助用户提升情绪控制力、生活觉知力、口才表达能力和头脑清晰度。',
    '回答风格：接住情绪，指出重复模式，区分事实/感受/判断，给轻量下一步。不要诊断疾病，不要说教，不要假装知道日记之外的事实。',
    '如果日记证据不足，要明确说明“从已有记录看”。',
  ].join('\n')
}

function readDashscopeReply(payload) {
  const content = payload?.output?.choices?.[0]?.message?.content
  if (typeof content === 'string') return content.trim()
  if (Array.isArray(content)) {
    return content
      .map((item) => item?.text ?? '')
      .filter(Boolean)
      .join('\n')
      .trim()
  }
  return ''
}

function readDashscopeError(payload) {
  if (!payload) return '心灵小蜜暂时没有连上 AI 服务。'
  const message = payload?.error?.message ?? payload?.message ?? payload?.msg ?? '心灵小蜜暂时没有连上 AI 服务。'
  const code = payload?.error?.code ?? payload?.code
  const requestId = payload?.request_id ?? payload?.requestId
  return [code ? `DashScope ${code}` : '', message, requestId ? `request_id: ${requestId}` : ''].filter(Boolean).join(' | ')
}

function formatEntryType(type) {
  if (type === 'video') return '视频记录'
  if (type === 'audio') return '音频记录'
  return '文字记录'
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Shanghai',
  })
}
