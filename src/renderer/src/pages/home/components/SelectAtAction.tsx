import { Model } from '@renderer/types'
import { List } from 'antd'
import { t } from 'i18next'
import { CSSProperties, FC, useEffect, useRef, useState } from 'react'

import SelectAtActionModel from './SelectAtActionModel'

interface Action {
  name: string
  type: ActionType
}

interface Props {
  onMentionModel: (model: Model, fromKeyboard: boolean) => void
  mentionModels: Model[]
}

type ActionType = 'model' | 'knowledge_base' | 'mcp'

const data: Action[] = [
  {
    name: t('chat.actions.model'),
    type: 'model'
  },
  {
    name: t('chat.actions.knowledge_base'),
    type: 'knowledge_base'
  },
  {
    name: t('chat.actions.mcp'),
    type: 'mcp'
  }
]

export const SelectAtAction: FC<Props> = ({ onMentionModel, mentionModels }) => {
  const listRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectModelActionShow, setSelectModelActionShow] = useState(false)
  const [isShow, setIsShow] = useState(true)
  useEffect(() => {
    const listElement = listRef.current
    if (listElement && isShow) {
      // 获取内容的实际高度
      listElement.style.display = 'block'
      const height = listElement.scrollHeight
      listElement.style.height = '0'
      // 触发重绘
      void listElement.offsetHeight
      listElement.style.height = `${height}px`
    }
  }, [isShow])

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (!isShow) return
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(0, prev - 1))
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(data.length - 1, prev + 1))
          break
        case 'Enter':
          e.preventDefault()
          handleItemSelect(data[selectedIndex].type)
          break
        case 'Escape':
          e.preventDefault()
          setIsShow(false)
          setSelectModelActionShow(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isShow, setIsShow, selectedIndex])

  // Function to handle item selection and print the type
  const handleItemSelect = (type: ActionType) => {
    switch (type) {
      case 'model':
        console.log('Selected type: model')
        setSelectModelActionShow(true)
        setIsShow(false)
        break
      case 'knowledge_base':
        console.log('Selected type: knowledge_base')
        break
      case 'mcp':
        console.log('Selected type: mcp')
        break
    }
  }

  const containerStyle: CSSProperties = {
    position: 'absolute',
    bottom: '10%',
    left: '23%',
    width: 'auto',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
  }

  const listContainerStyle: CSSProperties = {
    overflow: 'hidden',
    transition: 'height 0.3s ease, opacity 0.3s ease',
    height: 0,
    opacity: isShow ? 1 : 0,
    display: 'none', // 初始状态为隐藏，会在useEffect中控制
    backgroundColor: '#2d2d2d'
  }

  return (
    <div style={containerStyle}>
      {/* Show menu list when isShow is true */}
      {isShow && (
        <div ref={listRef} style={listContainerStyle}>
          <List
            bordered={false}
            dataSource={data}
            renderItem={(item, index) => (
              <List.Item
                style={{
                  backgroundColor: selectedIndex === index ? '#4e89e8' : '#2d2d2d',
                  color: selectedIndex === index ? '#ffffff' : '#e0e0e0',
                  padding: '12px 16px',
                  borderBottom: index < data.length - 1 ? '1px solid #3a3a3a' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => {
                  setSelectedIndex(index)
                  handleItemSelect(item.type)
                }}
                onMouseEnter={() => setSelectedIndex(index)}>
                {item.name}
              </List.Item>
            )}
          />
        </div>
      )}
      {/* Show only @ with SelectAtActionModel when model is selected */}
      {selectModelActionShow && (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <SelectAtActionModel
            isShow={selectModelActionShow}
            setIsShow={setSelectModelActionShow}
            onMentionModel={onMentionModel}
            mentionModels={mentionModels}
          />
        </div>
      )}
    </div>
  )
}
