import { List } from 'antd'
import { t } from 'i18next'
import { CSSProperties, FC, useEffect, useRef } from 'react'

interface Props {
  isShow: boolean
}

const data = [t('chat.actions.model'), t('chat.actions.knowledge_base'), t('chat.actions.mcp')]

export const SelectAtAction: FC<Props> = ({ isShow }) => {
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const listElement = listRef.current
    if (listElement) {
      if (isShow) {
        // 获取内容的实际高度
        listElement.style.display = 'block'
        const height = listElement.scrollHeight
        listElement.style.height = '0'
        // 触发重绘
        void listElement.offsetHeight
        listElement.style.height = `${height}px`
      } else {
        listElement.style.height = '0'
      }
    }
  }, [isShow])

  const containerStyle: CSSProperties = {
    position: 'absolute',
    bottom: '10%',
    left: '23%',
    width: 'auto'
  }

  const listContainerStyle: CSSProperties = {
    overflow: 'hidden',
    transition: 'height 0.3s ease, opacity 0.3s ease',
    height: 0,
    opacity: isShow ? 1 : 0,
    display: 'none' // 初始状态为隐藏，会在useEffect中控制
  }

  return (
    <div style={containerStyle}>
      <div ref={listRef} style={listContainerStyle}>
        <List bordered dataSource={data} renderItem={(item) => <List.Item>{item}</List.Item>} />
      </div>
    </div>
  )
}
