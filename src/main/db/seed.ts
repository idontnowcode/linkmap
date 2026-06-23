import { nanoid } from 'nanoid'
import { getDb, schema } from './client'

const { links, tags, linkTags, relations, collections, collectionLinks } = schema

/** 첫 실행 시 데모 그래프를 채운다 (links 테이블이 비어 있을 때만). */
export async function seedIfEmpty(): Promise<void> {
  const db = getDb()
  const existing = await db.select().from(links).all()
  if (existing.length > 0) return

  const now = new Date()
  const fav = (domain: string): string =>
    `https://www.google.com/s2/favicons?domain=${domain}&sz=64`

  // Tags
  const tagDefs = [
    { name: 'AI', color: '#3B82F6' },
    { name: 'Development', color: '#22C55E' },
    { name: 'Productivity', color: '#F97316' },
    { name: 'Design', color: '#A855F7' },
    { name: 'Business', color: '#EAB308' },
    { name: 'Research', color: '#14B8A6' }
  ]
  const tagIds: Record<string, string> = {}
  for (const t of tagDefs) {
    const id = nanoid()
    tagIds[t.name] = id
    await db.insert(tags).values({ id, name: t.name, color: t.color }).run()
  }

  // Links
  const linkDefs = [
    { key: 'openai', title: 'OpenAI', url: 'https://openai.com', desc: 'AI research and deployment company.', tags: ['AI', 'Research', 'Business'], fmt: true },
    { key: 'chatgpt', title: 'ChatGPT', url: 'https://chat.openai.com', desc: 'Conversational AI assistant.', tags: ['AI', 'Productivity'], fmt: true },
    { key: 'gpt4', title: 'GPT-4', url: 'https://openai.com/gpt-4', desc: 'Large multimodal model.', tags: ['AI', 'Research'], fmt: false },
    { key: 'openaiapi', title: 'OpenAI API', url: 'https://platform.openai.com', desc: 'Developer platform for OpenAI models.', tags: ['AI', 'Development'], fmt: false },
    { key: 'dalle', title: 'DALL·E', url: 'https://openai.com/dall-e-3', desc: 'Text-to-image generation.', tags: ['AI', 'Design'], fmt: false },
    { key: 'langchain', title: 'LangChain', url: 'https://www.langchain.com', desc: 'Framework for LLM applications.', tags: ['AI', 'Development'], fmt: true },
    { key: 'huggingface', title: 'Hugging Face', url: 'https://huggingface.co', desc: 'The AI community building the future.', tags: ['AI', 'Research'], fmt: false },
    { key: 'claude', title: 'Claude', url: 'https://claude.ai', desc: "Anthropic's AI assistant.", tags: ['AI', 'Productivity'], fmt: false }
  ]
  const linkIds: Record<string, string> = {}
  for (const l of linkDefs) {
    const id = nanoid()
    linkIds[l.key] = id
    const domain = new URL(l.url).hostname.replace(/^www\./, '')
    await db
      .insert(links)
      .values({
        id,
        title: l.title,
        url: l.url,
        description: l.desc,
        favicon: fav(domain),
        thumbnail: null,
        note: l.key === 'openai' ? '# Notes\n\nMission: ensure AGI benefits all of humanity.' : null,
        domain,
        favorite: l.fmt,
        deletedAt: null,
        createdAt: now,
        updatedAt: now
      })
      .run()
    for (const tn of l.tags) {
      await db.insert(linkTags).values({ linkId: id, tagId: tagIds[tn] }).run()
    }
  }

  // Relations (type = 스타일 구동, label = 표시 텍스트)
  const rel = async (
    sourceId: string,
    targetId: string,
    type: string,
    label: string | null,
    sourceKind: 'link' | 'tag' = 'link'
  ): Promise<void> => {
    await db
      .insert(relations)
      .values({
        id: nanoid(),
        sourceId,
        sourceKind,
        targetId,
        targetKind: 'link',
        type,
        label,
        createdAt: now
      })
      .run()
  }

  await rel(linkIds.openai, linkIds.chatgpt, 'related', 'developed by')
  await rel(linkIds.openai, linkIds.openaiapi, 'related', 'provides')
  await rel(linkIds.openaiapi, linkIds.gpt4, 'uses', 'uses')
  await rel(linkIds.openaiapi, linkIds.dalle, 'related', 'provides')
  await rel(linkIds.langchain, linkIds.openaiapi, 'uses', 'integrates')
  await rel(linkIds.langchain, linkIds.dalle, 'uses', 'supports')
  await rel(tagIds.AI, linkIds.openaiapi, 'related', 'related', 'tag')
  await rel(tagIds.AI, linkIds.openai, 'part_of', 'part of', 'tag')

  // Collections (데모 폴더 + 멤버십)
  const colDefs: { name: string; members: string[] }[] = [
    { name: 'Project Alpha', members: ['openai', 'openaiapi', 'gpt4'] },
    { name: 'Study', members: ['langchain', 'huggingface', 'claude'] },
    { name: 'Inspiration', members: ['dalle', 'chatgpt'] }
  ]
  for (const col of colDefs) {
    const id = nanoid()
    await db.insert(collections).values({ id, name: col.name, createdAt: now }).run()
    for (const key of col.members) {
      await db.insert(collectionLinks).values({ collectionId: id, linkId: linkIds[key] }).run()
    }
  }
}
