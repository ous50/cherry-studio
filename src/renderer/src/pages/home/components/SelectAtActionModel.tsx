import { PushpinOutlined } from '@ant-design/icons'
import ModelTags from '@renderer/components/ModelTags'
import { getModelLogo, isEmbeddingModel, isRerankModel } from '@renderer/config/models'
import { useProviders } from '@renderer/hooks/useProvider'
import { getModelUniqId } from '@renderer/services/ModelService'
import { Model, Provider } from '@renderer/types'
import { Avatar, Dropdown, Tooltip } from 'antd'
import { first, sortBy } from 'lodash'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

interface Props {
  isShow: boolean
  setIsShow: (show: boolean) => void
  onMentionModel: (model: Model, fromKeyboard: boolean) => void
  mentionModels: Model[]
}

export default function SelectAtActionModel({ isShow, setIsShow, onMentionModel, mentionModels }: Props) {
  const { providers } = useProviders()
  const [pinnedModels, setPinnedModels] = useState<string[]>([])
  const [searchText, setSearchText] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const { t } = useTranslation()
  const itemRefs = useRef<Array<HTMLDivElement | null>>([])
  const menuRef = useRef<HTMLDivElement>(null)
  const setItemRef = (index: number, el: HTMLDivElement | null) => {
    itemRefs.current[index] = el
  }

  const modelMenuItems = useMemo(() => {
    const items = providers
      .filter((p) => p.models && p.models.length > 0)
      .map((p) => {
        const filteredModels = sortBy(p.models, ['group', 'name'])
          .filter((m) => !isEmbeddingModel(m))
          .filter((m) => !isRerankModel(m))
          // Filter out pinned models from regular groups
          .filter((m) => !pinnedModels.includes(getModelUniqId(m)))
          // Filter by search text
          .filter((m) => {
            if (!searchText) return true
            return (
              m.name.toLowerCase().includes(searchText.toLowerCase()) ||
              m.id.toLowerCase().includes(searchText.toLowerCase())
            )
          })
          .map((m) => ({
            key: getModelUniqId(m),
            model: m,
            label: (
              <ModelItem>
                <ModelNameRow>
                  <span>{m?.name}</span> <ModelTags model={m} />
                </ModelNameRow>
                <PinIcon
                  onClick={(e) => {
                    e.stopPropagation()
                    togglePin(getModelUniqId(m))
                  }}
                  $isPinned={pinnedModels.includes(getModelUniqId(m))}>
                  <PushpinOutlined />
                </PinIcon>
              </ModelItem>
            ),
            icon: (
              <Avatar src={getModelLogo(m.id)} size={24}>
                {first(m.name)}
              </Avatar>
            ),
            onClick: () => onMentionModel(m, false)
          }))

        return filteredModels.length > 0
          ? {
              key: p.id,
              label: p.isSystem ? t(`provider.${p.id}`) : p.name,
              type: 'group' as const,
              children: filteredModels
            }
          : null
      })
      .filter((group): group is NonNullable<typeof group> => group !== null)

    if (pinnedModels.length > 0) {
      const pinnedItems = providers
        .filter((p): p is Provider => p.models && p.models.length > 0)
        .flatMap((p) =>
          p.models
            .filter((m) => pinnedModels.includes(getModelUniqId(m)))
            .map((m) => ({
              key: getModelUniqId(m),
              model: m,
              provider: p
            }))
        )
        .map((m) => ({
          ...m,
          key: m.key + 'pinned',
          label: (
            <ModelItem>
              <ModelNameRow>
                <span>
                  {m.model?.name} | {m.provider.isSystem ? t(`provider.${m.provider.id}`) : m.provider.name}
                </span>{' '}
                <ModelTags model={m.model} />
              </ModelNameRow>
              <PinIcon
                onClick={(e) => {
                  e.stopPropagation()
                  togglePin(getModelUniqId(m.model))
                }}
                $isPinned={true}>
                <PushpinOutlined />
              </PinIcon>
            </ModelItem>
          ),
          icon: (
            <Avatar src={getModelLogo(m.model.id)} size={24}>
              {first(m.model.name)}
            </Avatar>
          ),
          onClick: () => handleModelSelect(m.model)
        }))

      if (pinnedItems.length > 0) {
        items.unshift({
          key: 'pinned',
          label: t('models.pinned'),
          type: 'group' as const,
          children: pinnedItems
        })
      }
    }

    // Remove empty groups
    return items.filter((group) => group.children.length > 0)
  }, [providers, pinnedModels, searchText, t])

  // Get flattened list of all model items
  const flatModelItems = useMemo(() => {
    return modelMenuItems.flatMap((group) => group?.children || [])
  }, [modelMenuItems])

  const menu = (
    <div ref={menuRef} className="ant-dropdown-menu">
      {flatModelItems.length > 0 ? (
        modelMenuItems.map((group, groupIndex) => {
          if (!group) return null

          // Calculate starting index for items in this group
          const startIndex = modelMenuItems.slice(0, groupIndex).reduce((acc, g) => acc + (g?.children?.length || 0), 0)

          return (
            <div key={group.key} className="ant-dropdown-menu-item-group">
              <div className="ant-dropdown-menu-item-group-title">{group.label}</div>
              <div>
                {group.children.map((item, idx) => (
                  <div
                    key={item.key}
                    ref={(el) => setItemRef(startIndex + idx, el)}
                    className={`ant-dropdown-menu-item ${
                      selectedIndex === startIndex + idx ? 'ant-dropdown-menu-item-selected' : ''
                    }`}
                    onClick={item.onClick}>
                    <span className="ant-dropdown-menu-item-icon">{item.icon}</span>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          )
        })
      ) : (
        <div className="ant-dropdown-menu-item-group">
          <div className="ant-dropdown-menu-item no-results">{t('models.no_matches')}</div>
        </div>
      )}
    </div>
  )

  return isShow ? (
    <main>
      <Dropdown
        overlayStyle={{ marginBottom: 20 }}
        dropdownRender={() => menu}
        trigger={['click']}
        open={isShow}
        onOpenChange={(open) => {
          setIsShow(open)
        }}
        overlayClassName="mention-models-dropdown">
        <Tooltip placement="top" title={t('agents.edit.model.select.title')} arrow>
          {/* <ToolbarButton type="text" ref={dropdownRef}>
            <i className="iconfont icon-at" style={{ fontSize: 18 }}></i>
          </ToolbarButton> */}
        </Tooltip>
      </Dropdown>
    </main>
  ) : null
}

const ModelItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  width: 100%;
  min-width: 200px;
  gap: 16px;

  &:hover {
    .pin-icon {
      opacity: 0.3;
    }
  }
`

const ModelNameRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
`

const PinIcon = styled.span.attrs({ className: 'pin-icon' })<{ $isPinned: boolean }>`
  margin-left: auto;
  padding: 0 8px;
  opacity: ${(props) => (props.$isPinned ? 0.9 : 0)};
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  right: 0;
  color: ${(props) => (props.$isPinned ? 'var(--color-primary)' : 'inherit')};
  transform: ${(props) => (props.$isPinned ? 'rotate(-45deg)' : 'none')};
  font-size: 13px;

  &:hover {
    opacity: ${(props) => (props.$isPinned ? 1 : 0.7)} !important;
    color: ${(props) => (props.$isPinned ? 'var(--color-primary)' : 'inherit')};
  }
`
function togglePin(arg0: string) {
  throw new Error('Function not implemented.')
}

function handleModelSelect(m: Model): any {
  throw new Error('Function not implemented.')
}
