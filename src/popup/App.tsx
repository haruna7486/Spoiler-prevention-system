import { useEffect, useState } from 'react'
import { loadStorageData } from '../shared/storage'
import { normalize } from '../shared/normalize'
import type { KeywordGroup, StorageData } from '../shared/types'

function App() {
  const [data, setData] = useState<StorageData>({
    version: 1,
    groups: [],
  })
  const [label, setLabel] = useState('')
  const [keywordText, setKeywordText] = useState('')
  const [newKeywordByGroupId, setNewKeywordByGroupId] = useState<Record<string, string>>({})
  const [errorMessage, setErrorMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

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

  async function handleAddGroup() {
    const trimmedLabel = label.trim()
    const rawKeywords = keywordText
      .split(',')
      .map((keyword) => keyword.trim())
      .filter(Boolean)

    setErrorMessage('')
    setStatusMessage('')

    if (!trimmedLabel) {
      setErrorMessage('グループ名を入力してください。')
      return
    }

    if (rawKeywords.length === 0) {
      setErrorMessage('キーワードを1つ以上入力してください。')
      return
    }

    const normalizedKeywords = rawKeywords.map(normalize)

    if (normalizedKeywords.some((keyword) => keyword.length === 0)) {
      setErrorMessage('空のキーワードは登録できません。')
      return
    }

    if (new Set(normalizedKeywords).size !== normalizedKeywords.length) {
      setErrorMessage('同じキーワードが含まれています。')
      return
    }

    const hasDuplicateLabel = data.groups.some((group) => {
      return normalize(group.label) === normalize(trimmedLabel)
    })

    if (hasDuplicateLabel) {
      setErrorMessage('同じグループ名がすでにあります。')
      return
    }

    const newGroup: KeywordGroup = {
      id: crypto.randomUUID(),
      label: trimmedLabel,
      keywords: rawKeywords,
      enabled: true,
      createdAt: Date.now(),
    }

    const nextData: StorageData = {
      version: 1,
      groups: [...data.groups, newGroup],
    }

    try {
      setIsSaving(true)
      await saveData(nextData)
      setLabel('')
      setKeywordText('')
      setStatusMessage('保存しました。')
    } catch {
      setErrorMessage('保存に失敗しました。もう一度試してください。')
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
    const newKeyword = newKeywordByGroupId[groupId]?.trim() ?? ''

    setErrorMessage('')
    setStatusMessage('')

    if (!newKeyword) {
      setErrorMessage('追加するキーワードを入力してください。')
      return
    }

    const targetGroup = data.groups.find((group) => group.id === groupId)
    if (!targetGroup) {
      setErrorMessage('対象のグループが見つかりません。')
      return
    }

    const normalizedNewKeyword = normalize(newKeyword)
    const hasDuplicateKeyword = targetGroup.keywords.some((keyword) => {
      return normalize(keyword) === normalizedNewKeyword
    })

    if (hasDuplicateKeyword) {
      setErrorMessage('同じキーワードがすでにあります。')
      return
    }

    const nextGroups = data.groups.map((group) => {
      if (group.id !== groupId) {
        return group
      }

      return {
        ...group,
        keywords: [...group.keywords, newKeyword],
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
      setStatusMessage('キーワードを追加しました。')
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

  return (
    <main className="popup-page">
      <h1>ネタバレ防止</h1>
      <p className="description">
        YouTubeで見たくない結果や展開につながるキーワードを登録します。
      </p>

      <section className="card">
        <h2>グループを追加</h2>

        <label>
          グループ名
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="例: W杯2026"
          />
        </label>

        <label>
          キーワード
          <input
            value={keywordText}
            onChange={(event) => setKeywordText(event.target.value)}
            placeholder="例: W杯2026, ワールドカップ, アルゼンチン"
          />
        </label>

        <button onClick={handleAddGroup} disabled={isSaving}>
          {isSaving ? '保存中...' : '保存する'}
        </button>

        {errorMessage && <p className="error">{errorMessage}</p>}
        {statusMessage && <p className="status">{statusMessage}</p>}
      </section>

      <section className="card">
        <h2>登録済みグループ</h2>

        {data.groups.length === 0 ? (
          <p className="empty">まだグループがありません。</p>
        ) : (
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
              />
            ))}
          </ul>
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
}

function GroupItem({
  group,
  newKeyword,
  onNewKeywordChange,
  onAddKeyword,
  onDeleteKeyword,
  onToggle,
  onDelete,
}: GroupItemProps) {
  return (
    <li className="group-item">
      <div>
        <strong>{group.label}</strong>
        <p>{group.enabled ? '有効' : '無効'}</p>

        <ul className="keyword-list">
          {group.keywords.map((keyword) => (
            <li key={keyword} className="keyword-item">
              <span>{keyword}</span>
              <button onClick={() => onDeleteKeyword(group.id, keyword)}>
                削除
              </button>
            </li>
          ))}
        </ul>

        <div className="keyword-add-row">
          <input
            value={newKeyword}
            onChange={(event) => onNewKeywordChange(event.target.value)}
            placeholder="キーワードを追加"
          />
          <button onClick={() => onAddKeyword(group.id)}>追加</button>
        </div>
      </div>

      <div className="button-row">
        <button onClick={() => onToggle(group.id)}>
          {group.enabled ? '無効にする' : '有効にする'}
        </button>
        <button onClick={() => onDelete(group.id)}>グループ削除</button>
      </div>
    </li>
  )
}

export default App