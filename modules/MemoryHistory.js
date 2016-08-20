import warning from 'warning'
import invariant from 'invariant'
import React, { PropTypes } from 'react'
import { createKey } from './LocationKeys'
import HistoryContext from './HistoryContext'

const clamp = (n, lowerBound, upperBound) =>
  Math.min(Math.max(n, lowerBound), upperBound)

/**
 * A history that stores its own URL entries.
 */
class MemoryHistory extends React.Component {
  static propTypes = {
    initialEntries: PropTypes.array,
    initialIndex: PropTypes.number,
    keyLength: PropTypes.number,
    children: PropTypes.func.isRequired
  }

  static defaultProps = {
    initialEntries: [ { path: '/' } ],
    initialIndex: 0,
    keyLength: 6
  }

  state = {
    prevIndex: null,
    action: null,
    index: null,
    entries: null
  }

  createKey() {
    return createKey(this.props.keyLength)
  }

  prompt = (promptMessage) => {
    invariant(
      typeof promptMessage === 'function',
      'A <MemoryHistory> prompt must be a function'
    )

    warning(
      this.promptMessage == null,
      '<MemoryHistory> supports only one <Prompt> at a time'
    )

    this.promptMessage = promptMessage

    return () => {
      if (this.promptMessage === promptMessage)
        this.promptMessage = null
    }
  }

  confirmTransitionTo(action, location, callback) {
    const promptMessage = this.promptMessage

    if (typeof promptMessage === 'function') {
      promptMessage({ action, location }, callback)
    } else {
      callback(true)
    }
  }

  push = (path, state) => {
    const action = 'PUSH'
    const key = this.createKey()
    const location = {
      path,
      state,
      key
    }

    this.confirmTransitionTo(action, location, (ok) => {
      if (!ok)
        return

      this.setState(prevState => {
        const prevIndex = prevState.index
        const entries = prevState.entries.slice(0)

        const nextIndex = prevIndex + 1
        if (entries.length > nextIndex) {
          entries.splice(nextIndex, entries.length - nextIndex, location)
        } else {
          entries.push(location)
        }

        return {
          prevIndex: prevState.index,
          action,
          index: nextIndex,
          entries
        }
      })
    })
  }

  replace = (path, state) => {
    const action = 'REPLACE'
    const key = this.createKey()
    const location = {
      path,
      state,
      key
    }

    this.confirmTransitionTo(action, location, (ok) => {
      if (!ok)
        return

      this.setState(prevState => {
        const prevIndex = prevState.index
        const entries = prevState.entries.slice(0)

        entries[prevIndex] = location

        return {
          prevIndex: prevState.index,
          action,
          entries
        }
      })
    })
  }

  go = (n) => {
    const { index, entries } = this.state
    const nextIndex = clamp(index + n, 0, entries.length - 1)

    const action = 'POP'
    const location = entries[nextIndex]

    this.confirmTransitionTo(action, location, (ok) => {
      if (ok) {
        this.setState({
          prevIndex: index,
          action,
          index: nextIndex
        })
      } else {
        // Mimic the behavior of DOM histories by
        // causing a render after a cancelled POP.
        this.forceUpdate()
      }
    })
  }

  goBack = () =>
    this.go(-1)

  goForward = () =>
    this.go(1)

  componentWillMount() {
    const { initialEntries, initialIndex } = this.props

    this.setState({
      action: 'POP',
      index: clamp(initialIndex, 0, initialEntries.length - 1),
      entries: initialEntries
    })
  }

  render() {
    const { children } = this.props
    const { action, index, entries } = this.state
    const location = entries[index]
    const historyContext = {
      prompt: this.prompt,
      push: this.push,
      replace: this.replace,
      go: this.go,
      goBack: this.goBack,
      goForward: this.goForward
    }

    return (
      <HistoryContext
        action={action}
        location={location}
        historyContext={historyContext}
        children={children}
      />
    )
  }
}

export default MemoryHistory
