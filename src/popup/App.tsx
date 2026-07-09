import { useEffect, useRef, useState } from 'react'
import { loadStorageData } from '../shared/storage'
import { normalize } from '../shared/normalize'
import type { KeywordGroup, StorageData } from '../shared/types'

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  )
}

function PlusIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

const suggestionDictionary: Record<string, string[]> = {
  'w杯': ['スコア', '結果', '決勝', '準決勝', 'ハイライト', '勝利', '敗退'],
  'ワールドカップ': ['スコア', '結果', '決勝', '準決勝', 'ハイライト', '勝利', '敗退'],
  'サッカー': ['スコア', 'ゴール', '結果', 'ハイライト', 'PK', '勝利', '敗退'],
  'ベスト':['ベスト8', 'ベスト4'],
  '準決勝': ['決勝', '結果', 'ハイライト'],
  'アルゼンチン':['メッシ', 'ハットトリック', 'ゴール', '勝利', '敗退'],
  'メッシ':['得点', 'ゴール', '勝利', '敗退'],
  '決勝':['結果', 'ハイライト', '優勝'],
  '優勝':['結果', 'ハイライト','悲願'],
  'スペイン':['得点', 'ゴール', '勝利', '敗退', 'ヤマル'],
  'フランス':['エンバペ', 'ゴール', '勝利', '敗退'],
  'モロッコ':['ハキミ', '勝利', '敗退'],
  'ノルウェー':['ハーランド', 'ゴール', '勝利', '敗退'],
  'イングランド':['ベリンガム', 'ケイン', 'ゴール', '勝利', '敗退'],
  'スイス':['シャキリ', 'ゴール', '勝利', '敗退'],
  'ベルギー':['ルカク', 'デ・ブライネ', 'ドク', 'トロサール', 'デ・ケテラーレ', 'ティーレマンス', 'ゴール', '勝利', '敗退'],
}

function getSuggestedKeywords(inputText: string): string[] {
  const normalizedInput = normalize(inputText)
  const suggestions = new Set<string>()

  Object.entries(suggestionDictionary).forEach(([triggerWord, words]) => {
    if (normalizedInput.includes(normalize(triggerWord))) {
      words.forEach((word) => suggestions.add(word))
    }
  })

  return Array.from(suggestions)
}

function App() {
  const [data, setData] = useState<StorageData>({
    version: 1,
    groups: [],
  })
  const [label, setLabel] = useState('')
  const [newKeywordByGroupId, setNewKeywordByGroupId] = useState<Record<string, string>>({})
  const [errorMessage, setErrorMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isGroupsSectionOpen, setIsGroupsSectionOpen] = useState(true)
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(new Set())
  const [flashGroupId, setFlashGroupId] = useState<string | null>(null)
  const [pendingFocusGroupId, setPendingFocusGroupId] = useState<string | null>(null)

  useEffect(() => {
    loadStorageData()
      .then((loadedData) => {
        setData(loadedData)
      })
      .catch(() => {
        setErrorMessage('設定の読み込みに失敗しました。')
      })
  }, [])

  async function saveData(nextData: StorageData) {
    await chrome.storage.local.set({
      version: nextData.version,
      groups: nextData.groups,
    })

    setData(nextData)
  }

  async function handleCreateGroup() {
    const trimmedLabel = label.trim()

    setErrorMessage('')
    setStatusMessage('')

    if (!trimmedLabel) {
      setErrorMessage('名前を入力してください。')
      return
    }

    const existingGroup = data.groups.find((group) => normalize(group.label) === normalize(trimmedLabel))

    if (existingGroup) {
      setErrorMessage(`「${trimmedLabel}」はすでに登録されています。`)
      setIsGroupsSectionOpen(true)
      setCollapsedGroupIds((current) => {
        const next = new Set(current)
        next.delete(existingGroup.id)
        return next
      })
      setFlashGroupId(existingGroup.id)
      return
    }

    const newGroup: KeywordGroup = {
      id: crypto.randomUUID(),
      label: trimmedLabel,
      keywords: [],
      enabled: true,
      createdAt: Date.now(),
    }

    const nextData: StorageData = {
      version: 1,
      groups: [newGroup, ...data.groups],
    }

    try {
      setIsSaving(true)
      await saveData(nextData)
      setLabel('')
      setStatusMessage('作成しました。続けてキーワードを追加してください。')
      setIsGroupsSectionOpen(true)
      setFlashGroupId(newGroup.id)
      setPendingFocusGroupId(newGroup.id)
    } catch {
      setErrorMessage('作成に失敗しました。もう一度試してください。')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleToggleGroup(groupId: string) {
    const nextGroups = data.groups.map((group) => {
      if (group.id !== groupId) {
        return group
      }

      return {
        ...group,
        enabled: !group.enabled,
      }
    })

    const nextData: StorageData = {
      version: 1,
      groups: nextGroups,
    }

    try {
      await saveData(nextData)
      setStatusMessage('状態を更新しました。')
      setErrorMessage('')
    } catch {
      setErrorMessage('状態の更新に失敗しました。')
    }
  }

  async function handleDeleteGroup(groupId: string) {
    const nextData: StorageData = {
      version: 1,
      groups: data.groups.filter((group) => group.id !== groupId),
    }

    try {
      await saveData(nextData)
      setStatusMessage('削除しました。')
      setErrorMessage('')
    } catch {
      setErrorMessage('削除に失敗しました。')
    }
  }

  async function handleAddKeyword(groupId: string) {
    const candidates = (newKeywordByGroupId[groupId] ?? '')
      .split(',')
      .map((keyword) => keyword.trim())
      .filter(Boolean)

    setErrorMessage('')
    setStatusMessage('')

    if (candidates.length === 0) {
      setErrorMessage('追加するキーワードを入力してください。')
      return
    }

    const targetGroup = data.groups.find((group) => group.id === groupId)
    if (!targetGroup) {
      setErrorMessage('対象のブロック対象が見つかりません。')
      return
    }

    const seen = new Set(targetGroup.keywords.map(normalize))
    const newKeywords: string[] = []
    for (const candidate of candidates) {
      const normalized = normalize(candidate)
      if (seen.has(normalized)) continue
      seen.add(normalized)
      newKeywords.push(candidate)
    }

    if (newKeywords.length === 0) {
      setErrorMessage('入力したキーワードはすでに登録されています。')
      return
    }

    const nextGroups = data.groups.map((group) => {
      if (group.id !== groupId) {
        return group
      }

      return {
        ...group,
        keywords: [...group.keywords, ...newKeywords],
      }
    })

    const nextData: StorageData = {
      version: 1,
      groups: nextGroups,
    }

    try {
      await saveData(nextData)
      setNewKeywordByGroupId((current) => ({
        ...current,
        [groupId]: '',
      }))
      setStatusMessage(
        newKeywords.length === 1 ? 'キーワードを追加しました。' : `キーワードを${newKeywords.length}件追加しました。`,
      )
    } catch {
      setErrorMessage('キーワードの追加に失敗しました。')
    }
  }

  async function handleDeleteKeyword(groupId: string, keywordToDelete: string) {
    const nextGroups = data.groups.map((group) => {
      if (group.id !== groupId) {
        return group
      }

      return {
        ...group,
        keywords: group.keywords.filter((keyword) => keyword !== keywordToDelete),
      }
    })

    const nextData: StorageData = {
      version: 1,
      groups: nextGroups,
    }

    try {
      await saveData(nextData)
      setStatusMessage('キーワードを削除しました。')
      setErrorMessage('')
    } catch {
      setErrorMessage('キーワードの削除に失敗しました。')
    }
  }

  function handleToggleCollapse(groupId: string) {
    setCollapsedGroupIds((current) => {
      const next = new Set(current)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  return (
    <main className="popup-page">
      <h1>
        <EyeOffIcon />
        ネタバレ防止
      </h1>
      <p className="description">YouTubeで見たくない結果や展開につながる言葉を「ブロック対象」として登録します。</p>

      <section className="card">
        <h2>
          <PlusIcon />
          ブロック対象を追加
        </h2>

        <div className="quick-add-row">
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleCreateGroup()
              }
            }}
            placeholder="例: W杯2026"
            aria-label="ブロック対象の名前"
          />
          <button
            className="btn-primary btn-square"
            type="button"
            onClick={handleCreateGroup}
            disabled={isSaving}
            aria-label="ブロック対象を作成"
          >
            <PlusIcon size={16} />
          </button>
        </div>

        {errorMessage && <p className="error">{errorMessage}</p>}
        {statusMessage && <p className="status">{statusMessage}</p>}
      </section>

      <section className="card">
        {data.groups.length === 0 ? (
          <>
            <h2>
              <ListIcon />
              登録済みのブロック対象
            </h2>
            <p className="empty">まだブロック対象がありません。</p>
          </>
        ) : (
          <>
            <button
              className="section-toggle"
              type="button"
              aria-expanded={isGroupsSectionOpen}
              aria-controls="groupsWrap"
              onClick={() => setIsGroupsSectionOpen((current) => !current)}
            >
              <span className="section-toggle-label">
                <ListIcon />
                登録済みのブロック対象
                <span className="badge">{data.groups.length}</span>
              </span>
              <ChevronIcon className="chevron" />
            </button>

            <div id="groupsWrap" className={`group-list-wrap${isGroupsSectionOpen ? ' is-open' : ''}`}>
              <div className="group-list-scroll">
                <ul className="group-list">
                  {data.groups.map((group) => (
                    <GroupItem
                      key={group.id}
                      group={group}
                      newKeyword={newKeywordByGroupId[group.id] ?? ''}
                      onNewKeywordChange={(value) => {
                        setNewKeywordByGroupId((current) => ({
                          ...current,
                          [group.id]: value,
                        }))
                      }}
                      onAddKeyword={handleAddKeyword}
                      onDeleteKeyword={handleDeleteKeyword}
                      onToggle={handleToggleGroup}
                      onDelete={handleDeleteGroup}
                      isCollapsed={collapsedGroupIds.has(group.id)}
                      onToggleCollapse={handleToggleCollapse}
                      isFlashing={flashGroupId === group.id}
                      onFlashEnd={(groupId) => {
                        setFlashGroupId((current) => (current === groupId ? null : current))
                      }}
                      autoFocusKeyword={pendingFocusGroupId === group.id}
                    />
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  )
}

type GroupItemProps = {
  group: KeywordGroup
  newKeyword: string
  onNewKeywordChange: (value: string) => void
  onAddKeyword: (groupId: string) => void
  onDeleteKeyword: (groupId: string, keyword: string) => void
  onToggle: (groupId: string) => void
  onDelete: (groupId: string) => void
  isCollapsed: boolean
  onToggleCollapse: (groupId: string) => void
  isFlashing: boolean
  onFlashEnd: (groupId: string) => void
  autoFocusKeyword: boolean
}

const PEEK_COUNT = 3

function GroupItem({
  group,
  newKeyword,
  onNewKeywordChange,
  onAddKeyword,
  onDeleteKeyword,
  onToggle,
  onDelete,
  isCollapsed,
  onToggleCollapse,
  isFlashing,
  onFlashEnd,
  autoFocusKeyword,
}: GroupItemProps) {
  const itemRef = useRef<HTMLLIElement>(null)
  const keywordInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isFlashing) {
      itemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [isFlashing])

  useEffect(() => {
    if (autoFocusKeyword) {
      keywordInputRef.current?.focus()
    }
  }, [autoFocusKeyword])

  const displayedKeywords = isCollapsed ? group.keywords.slice(0, PEEK_COUNT) : group.keywords
  const hiddenCount = isCollapsed ? Math.max(0, group.keywords.length - PEEK_COUNT) : 0
  const suggestedKeywords = getSuggestedKeywords(`${group.label} ${newKeyword}`).filter(
    (suggestion) => !group.keywords.some((keyword) => normalize(keyword) === normalize(suggestion)),
  )

  return (
    <li
      ref={itemRef}
      className={`group-item${isCollapsed ? ' is-collapsed' : ''}${isFlashing ? ' is-flash' : ''}`}
      onAnimationEnd={() => {
        if (isFlashing) onFlashEnd(group.id)
      }}
    >
      <div className="group-item-header">
        <div className="group-item-title">
          <strong>{group.label}</strong>
          <span className="group-meta">キーワード {group.keywords.length}件</span>
        </div>
        <div className="group-item-header-right">
          <span className={`status-pill ${group.enabled ? 'is-active' : 'is-paused'}`}>
            {group.enabled ? 'ブロック中' : '一時停止'}
          </span>
          <button
            className="item-toggle"
            type="button"
            aria-expanded={!isCollapsed}
            aria-label="詳細を開閉"
            onClick={() => onToggleCollapse(group.id)}
          >
            <ChevronIcon />
          </button>
        </div>
      </div>

      <ul className="keyword-list">
        {displayedKeywords.map((keyword) => (
          <li key={keyword} className="keyword-item">
            <span>{keyword}</span>
            <button type="button" onClick={() => onDeleteKeyword(group.id, keyword)}>
              ×
            </button>
          </li>
        ))}
        {hiddenCount > 0 && (
          <li className="keyword-item keyword-more">
            <span>+{hiddenCount}</span>
          </li>
        )}
      </ul>

      {group.keywords.length === 0 && (
        <p className="keyword-empty-hint">まだキーワードがありません。下の欄から追加してください。</p>
      )}

      <div className="keyword-add-row">
        <input
          ref={keywordInputRef}
          value={newKeyword}
          onChange={(event) => onNewKeywordChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onAddKeyword(group.id)
            }
          }}
          placeholder="キーワードを追加（カンマ区切りで複数可）"
        />
        <button type="button" onClick={() => onAddKeyword(group.id)} aria-label="キーワードを追加">
          <PlusIcon size={14} />
        </button>
      </div>

      {suggestedKeywords.length > 0 && (
        <div className="suggestion-area">
          <p className="suggestion-title">関連キーワード候補</p>
          <div className="suggestion-list">
            {suggestedKeywords.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="suggestion-chip"
                onClick={() => {
                  const currentKeywords = newKeyword
                    .split(',')
                    .map((keyword) => keyword.trim())
                    .filter(Boolean)

                  const alreadyExists = currentKeywords.some(
                    (keyword) => normalize(keyword) === normalize(suggestion),
                  )

                  if (alreadyExists) return

                  onNewKeywordChange([...currentKeywords, suggestion].join(', '))
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="button-row">
        <button type="button" className={group.enabled ? 'btn-warn' : 'btn-resume'} onClick={() => onToggle(group.id)}>
          {group.enabled ? '一時停止' : '再開する'}
        </button>
        <button type="button" className="btn-danger-outline" onClick={() => onDelete(group.id)}>
          削除
        </button>
      </div>
    </li>
  )
}

export default App
