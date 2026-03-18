import { http, HttpResponse } from 'msw'

export const anthropicHandlers = [
  http.post('https://api.anthropic.com/v1/messages', () => {
    return HttpResponse.json({
      id: 'msg_test_123',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'Mock caption text #hashtag #test' }],
      model: 'claude-sonnet-4-6',
      stop_reason: 'end_turn',
      usage: { input_tokens: 20, output_tokens: 10 },
    })
  }),
]
