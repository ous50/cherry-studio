import { CheckOutlined, ExpandOutlined, LoadingOutlined, PlayCircleOutlined, WarningOutlined } from '@ant-design/icons'
import { useMessageOperations } from '@renderer/hooks/useMessageOperations'
import { useSettings } from '@renderer/hooks/useSettings'
import { Assistant, Message, Topic } from '@renderer/types'
import { Collapse, message as antdMessage, Modal, Tooltip } from 'antd'
import { isEmpty } from 'lodash'
import { FC, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

interface Props {
  assistant?: Assistant
  topic?: Topic
  message: Message
}

const MessageTools: FC<Props> = ({ assistant, topic, message }) => {
  const [activeKeys, setActiveKeys] = useState<string[]>([])
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({})
  const [expandedResponse, setExpandedResponse] = useState<{ content: string; title: string } | null>(null)
  const [executingTools, setExecutingTools] = useState<Record<string, boolean>>({})
  const { runMessageTool } = useMessageOperations(topic!)
  const { t } = useTranslation()
  const { messageFont, fontSize } = useSettings()
  const fontFamily = useMemo(() => {
    return messageFont === 'serif'
      ? 'serif'
      : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans","Helvetica Neue", sans-serif'
  }, [messageFont])

  const toolResponses = message.metadata?.mcpTools || []

  if (isEmpty(toolResponses)) {
    return null
  }

  const copyContent = (content: string, toolId: string) => {
    navigator.clipboard.writeText(content)
    antdMessage.success({ content: t('message.copied'), key: 'copy-message' })
    setCopiedMap((prev) => ({ ...prev, [toolId]: true }))
    setTimeout(() => setCopiedMap((prev) => ({ ...prev, [toolId]: false })), 2000)
  }

  const handleCollapseChange = (keys: string | string[]) => {
    setActiveKeys(Array.isArray(keys) ? keys : [keys])
  }

  // Mock API call to execute a tool
  const executeTool = async (toolId: string) => {
    try {
      setExecutingTools((prev) => ({ ...prev, [toolId]: true }))

      await runMessageTool(assistant!, message, toolId)
    } catch (error) {
      console.error('Failed to execute tool:', error)
      antdMessage.error({ content: t('message.tools.executionFailed'), key: 'execute-tool' })
    } finally {
      setExecutingTools((prev) => ({ ...prev, [toolId]: false }))
    }
  }

  // Format tool responses for collapse items
  const getCollapseItems = () => {
    const items: { key: string; label: React.ReactNode; children: React.ReactNode }[] = []
    // Add tool responses
    for (const toolResponse of toolResponses) {
      const { id, tool, status, response } = toolResponse
      const isPending = status === 'pending'
      const isInvoking = status === 'invoking'
      const isDone = status === 'done'
      const isError = status === 'error'
      const isExecuting = executingTools[id]
      const result = isDone
        ? {
            params: tool.inputSchema,
            response: toolResponse.response
          }
        : null

      items.push({
        key: id,
        label: (
          <MessageTitleLabel>
            <TitleContent>
              <ToolName>{tool.name}</ToolName>
              <StatusIndicator $isInvoking={isInvoking} $isPending={isPending} $isError={isError}>
                {isPending && t('message.tools.pending', 'Pending')}
                {isInvoking && t('message.tools.invoking')}
                {isDone && t('message.tools.completed')}
                {isError && t('message.tools.failed')}

                {isInvoking && <LoadingOutlined spin style={{ marginLeft: 6 }} />}
                {isDone && <CheckOutlined style={{ marginLeft: 6 }} />}
                {isError && <WarningOutlined style={{ marginLeft: 6 }} />}
              </StatusIndicator>
            </TitleContent>
            <ActionButtonsContainer>
              {isPending && (
                <Tooltip title={t('message.tools.execute', 'Invoke')} mouseEnterDelay={0.5}>
                  <ActionButton
                    className="message-action-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      executeTool(id)
                    }}
                    disabled={isExecuting}
                    aria-label={t('message.tools.execute')}>
                    {isExecuting ? <LoadingOutlined /> : <PlayCircleOutlined />}
                  </ActionButton>
                </Tooltip>
              )}

              {isDone && response && (
                <>
                  <Tooltip title={t('common.expand')} mouseEnterDelay={0.5}>
                    <ActionButton
                      className="message-action-button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedResponse({
                          content: JSON.stringify(response, null, 2),
                          title: tool.name
                        })
                      }}
                      aria-label={t('common.expand')}>
                      <ExpandOutlined />
                    </ActionButton>
                  </Tooltip>
                  <Tooltip title={t('common.copy')} mouseEnterDelay={0.5}>
                    <ActionButton
                      className="message-action-button"
                      onClick={(e) => {
                        e.stopPropagation()
                        copyContent(JSON.stringify(result, null, 2), id)
                      }}
                      aria-label={t('common.copy')}>
                      {!copiedMap[id] && <i className="iconfont icon-copy"></i>}
                      {copiedMap[id] && <CheckOutlined style={{ color: 'var(--color-primary)' }} />}
                    </ActionButton>
                  </Tooltip>
                </>
              )}

              {isError && (
                <Tooltip title={t('message.tools.retry')} mouseEnterDelay={0.5}>
                  <ActionButton
                    className="message-action-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      executeTool(id)
                    }}
                    disabled={isExecuting}
                    aria-label={t('message.tools.retry')}>
                    {isExecuting ? <LoadingOutlined /> : <i className="iconfont icon-refresh"></i>}
                  </ActionButton>
                </Tooltip>
              )}
            </ActionButtonsContainer>
          </MessageTitleLabel>
        ),
        children: (
          <ToolResponseContainer style={{ fontFamily, fontSize: '12px' }}>
            <CodeBlock>
              {JSON.stringify(
                {
                  Server: tool.serverName,
                  ToolName: tool.name,
                  ToolArgs: toolResponse.tool.inputSchema,
                  ToolResponse:
                    isDone && response
                      ? response
                      : isError
                        ? toolResponse.response
                        : t('message.tools.noResponse', 'No response available')
                },
                null,
                4
              )}
            </CodeBlock>
          </ToolResponseContainer>
        )
      })
    }

    return items
  }

  return (
    <>
      <CollapseContainer
        activeKey={activeKeys}
        size="small"
        onChange={handleCollapseChange}
        className="message-tools-container"
        items={getCollapseItems()}
        expandIcon={({ isActive }) => (
          <CollapsibleIcon className={`iconfont ${isActive ? 'icon-chevron-down' : 'icon-chevron-right'}`} />
        )}
      />

      <Modal
        title={expandedResponse?.title}
        open={!!expandedResponse}
        onCancel={() => setExpandedResponse(null)}
        footer={null}
        width="80%"
        centered
        styles={{ body: { maxHeight: '80vh', overflow: 'auto' } }}>
        {expandedResponse && (
          <ExpandedResponseContainer style={{ fontFamily, fontSize }}>
            <ActionButton
              className="copy-expanded-button"
              onClick={() => {
                if (expandedResponse) {
                  navigator.clipboard.writeText(expandedResponse.content)
                  antdMessage.success({ content: t('message.copied'), key: 'copy-expanded' })
                }
              }}
              aria-label={t('common.copy')}>
              <i className="iconfont icon-copy"></i>
            </ActionButton>
            <CodeBlock>{expandedResponse.content}</CodeBlock>
          </ExpandedResponseContainer>
        )}
      </Modal>
    </>
  )
}

const CollapseContainer = styled(Collapse)`
  margin-bottom: 15px;
  border-radius: 8px;
  overflow: hidden;

  .ant-collapse-header {
    background-color: var(--color-bg-2);
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--color-bg-3);
    }
  }

  .ant-collapse-content-box {
    padding: 0 !important;
  }
`

const MessageTitleLabel = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 26px;
  gap: 10px;
  padding: 0;
`

const TitleContent = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
`

const ToolName = styled.span`
  color: var(--color-text);
  font-weight: 500;
  font-size: 13px;
`

const StatusIndicator = styled.span<{ $isInvoking?: boolean; $isPending?: boolean; $isError?: boolean }>`
  color: ${(props) => {
    if (props.$isInvoking) return 'var(--color-primary)'
    if (props.$isPending) return 'var(--color-warning, #faad14)'
    if (props.$isError) return 'var(--color-error, #f5222d)'
    return 'var(--color-success, #52c41a)'
  }};
  font-size: 11px;
  display: flex;
  align-items: center;
  opacity: 0.85;
  border-left: 1px solid var(--color-border);
  padding-left: 8px;
`

const ActionButtonsContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-left: auto;
`

const ActionButton = styled.button`
  background: none;
  border: none;
  color: var(--color-text-2);
  cursor: pointer;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: all 0.2s;
  border-radius: 4px;

  &:hover {
    opacity: 1;
    color: var(--color-text);
    background-color: var(--color-bg-1);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    opacity: 1;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    &:hover {
      background-color: transparent;
    }
  }

  .iconfont {
    font-size: 14px;
  }
`

const CollapsibleIcon = styled.i`
  color: var(--color-text-2);
  font-size: 12px;
  transition: transform 0.2s;
`

const ToolResponseContainer = styled.div`
  background: var(--color-bg-1);
  border-radius: 0 0 4px 4px;
  padding: 12px 16px;
  overflow: auto;
  max-height: 300px;
  border-top: 1px solid var(--color-border);
  position: relative;
`

const CodeBlock = styled.pre`
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--color-text);
  font-family: ubuntu;
`

const ExpandedResponseContainer = styled.div`
  background: var(--color-bg-1);
  border-radius: 8px;
  padding: 16px;
  position: relative;

  .copy-expanded-button {
    position: absolute;
    top: 10px;
    right: 10px;
    background-color: var(--color-bg-2);
    border-radius: 4px;
    z-index: 1;
  }

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--color-text);
  }
`

export default MessageTools
