export async function generateMetadata(scriptText) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const prompt = `You are a viral social media growth expert who specializes in Facebook Reels and YouTube Shorts.

Based on this video description, generate a viral title and hashtags.

VIDEO DESCRIPTION: "${scriptText}"

RULES FOR TITLE:
- Must be EXTREMELY viral, clickbait-worthy, and trending
- Use power words like: "You Won't Believe", "Nobody Expected", "Insane", "Epic", "Shocking", "Unstoppable", "Destroyed", "Insane Battle", etc.
- Include 1-2 relevant emojis inside the title naturally
- Max 60 characters total including emojis
- NO description, NO explanation — just the title

RULES FOR HASHTAGS:
- Exactly 15 hashtags
- Mix of: viral/trending tags, niche-specific tags, broad reach tags
- Include 1-2 emojis as hashtags (e.g. #🔥 #💥)
- All start with #, no spaces inside
- Must be currently trending and high-reach

Return ONLY valid JSON (no markdown, no backticks, no explanation):
{
  "title": "🔥 Epic title here with emoji",
  "hashtags": ["#hashtag1", "#hashtag2", "#🔥", ...exactly 25 total]
}`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost',
      'X-Title': 'VidPublisher',
    },
    body: JSON.stringify({
      model: 'openrouter/auto',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
      max_tokens: 800,
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter error: ${await res.text()}`);
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || '';
  const cleaned = raw.replace(/```json|```/g, '').trim();

  const defaultHashtags = [
    '#ai',
    '#artificialintelligence',
    '#generativeai',
    '#aianimation',
    '#aifilm',
    '#digitalart',
    '#surreal',
    '#futureofcontent',
    '#aimovie',
    '#midjourney',
    '#videogen',
    '#aiartcommunity',
    '#creativeai',
    '#tech',
    '#innovation',
  ];

  try {
    const parsed = JSON.parse(cleaned);
    const generatedHashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : [];
    const combinedHashtags = [...new Set([...generatedHashtags, ...defaultHashtags])];
    
    return {
      title: parsed.title || '🔥 Epic Video',
      hashtags: combinedHashtags.slice(0, 40),
    };
  } catch {
    return {
      title: '🔥 You Won\'t Believe This',
      hashtags: defaultHashtags,
    };
  }
}
