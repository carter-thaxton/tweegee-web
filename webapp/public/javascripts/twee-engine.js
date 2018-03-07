
class TweeEngine {

  constructor(story) {
    this.story = story

    this.passagesByName = {}
    story.passages.forEach(passage => {
      this.passagesByName[passage.name] = passage
    })

    this.defaultDelayText = "[Taylor is busy]"
    this.resetStory()
  }

  resetStory() {
    this.variables = {}
    this.passagesVisited = {}
    this.gotoPassage(this.story.start)
  }

  gotoPassage(name) {
    this.currentPassageName = name
    this.currentLine = ""
    this.nestedBlocks = []
    this.nestedStatementIndices = []
    this.nestedCallbacks = []
    this.statementIndex = 0
    this.awaitingChoice = false

    const passage = this.passagesByName[name]
    if (passage) {
      this.currentBlock = passage.statements
      const visitCount = this.passagesVisited[name] || 0
      this.passagesVisited[name] = visitCount + 1
    } else {
      this.currentBlock = []
      throw new Error('No passage named: ' + name)
    }
  }

  currentPassage() {
    return this.passagesByName[this.currentPassageName]
  }

  nextStatement() {
    return this.currentBlock[this.statementIndex]
  }

  // returns one of:
  // { action: 'message', text: 'A line of text' }
  // { action: 'choice', choices: [{title: 'Choose this', passage: 'choice1'}, {title: 'Or this', passage: 'choice2'}] }
  // { action: 'delay', delay: '5m', seconds: 300, text: 'Taylor is busy' }
  // { action: 'error', error: 'Undefined variable: $foo' }
  // { action: 'end' }
  getNextAction() {
    try {
      while (true) {
        const result = this.interpretNextStatement()
        if (result) {
          console.log(result)
          return result
        }
      }
    } catch (err) {
      return { action: 'error', error: err.message }
    }
  }

  // return an action, or null to continue
  interpretNextStatement() {
    if (this.awaitingChoice) {
      throw new Error('Awaiting a choice.  Must make choice with gotoPassage')
    }

    const stmt = this.nextStatement()
    if (stmt) {
      // advance index within block
      // some statements like 'if' or 'link' may alter this further by pushing a block or going to another passage
      this.statementIndex += 1
      return this.interpretStatement(stmt)
    } else if (this.isNestedBlock()) {
      // finished previous block.  pop nested statement.
      // if popped statement has a callback, call it and it may also produce a result.
      const popFn = this.popBlock()
      if (popFn) {
        return popFn()
      } else {
        return null
      }
    } else {
      // reached the end
      return { action: 'end' }
    }
  }


  isNestedBlock() {
    return this.nestedStatementIndices.length > 0
  }

  pushBlock(block, popFn) {
      this.nestedBlocks.push(this.currentBlock)
      this.nestedStatementIndices.push(this.statementIndex)
      this.nestedCallbacks.push(popFn || null)
      this.currentBlock = block
      this.statementIndex = 0
  }

  popBlock() {
      this.currentBlock = this.nestedBlocks.pop()
      this.statementIndex = this.nestedStatementIndices.pop()
      return this.nestedCallbacks.pop()
  }

  includePassage(name) {
    const passage = this.passagesByName[name]
    if (passage) {
      const returnToPassage = this.currentPassageName
      this.currentPassageName = name
      this.pushBlock(passage.statements, () => {
        this.currentPassageName = returnToPassage
      })
    } else {
        throw new Error('No passage named: ' + name)
    }
  }

  interpretStatement(stmt) {
    // Print out for now
    console.log(stmt)

    var result = null
    switch (stmt._type) {
      case 'newline':
      const message = this.currentLine.trim()
      if (message) {
        result = { action: 'message', text: message }
      }
      this.currentLine = ""
      break

      case 'text':
      this.currentLine += stmt.text
      break

      case 'expression':
      this.currentLine += this.interpretExpression(stmt.expression)
      break

      case 'set':
      this.variables[stmt.variable] = this.interpretExpression(stmt.expression)
      break

      case 'link':
      if (this.currentLine) throw new Error('Did not emit newline before link')
      const passage = stmt.passage || this.interpretExpression(stmt.expression)
      this.gotoPassage(passage)
      break

      case 'delay':
      if (this.currentLine) throw new Error('Did not emit newline before delay')
      this.pushBlock(stmt.statements, () => {
        const text = this.currentLine || this.defaultDelayText
        this.currentLine = ""
        return { action: 'delay', delay: stmt.delay, seconds: stmt.seconds, text: text }
      })
      break

      case 'choice':
      result = { action: 'choice', choices: stmt.choices }
      this.awaitingChoice = true
      break

      case 'include':
      const incPassage = stmt.passage || this.interpretExpression(stmt.expression)
      this.includePassage(incPassage)
      break

      case 'if':
      for (const clause of stmt.clauses) {
        // no condition means else clause
        const ok = !clause.condition || this.interpretExpression(clause.condition)
        if (ok) {
          this.pushBlock(clause.statements)
          break
        }
      }
      break

      default:
      throw new Error('Unknown statement type: ' + stmt._type)
    }

    return result
  }

  interpretExpression(expr) {
    const modifiedExpr = "'use strict'; " + expr
      .replace(/$("[^"]*"|'[^']*')|(\$\w+)/g, (match, quoted, variable) => {  // find unquoted uses of $variables
        if (quoted) { return quoted }
        else if (variable) {
          if (variable in this.variables) {
            return JSON.stringify(this.variables[variable])
          } else {
            throw new Error('Variable ' + variable + ' is not defined')
          }
        } else {
          throw new Error('Error while replacing variables in expression: ' + expr)
        }
      })

    try {
      return eval(modifiedExpr)
    } catch (e) {
      console.log(modifiedExpr)
      throw new Error("Cannot evaluate expression: " + expr)
    }
  }

  visited(passage) {
    passage = passage || this.currentPassageName
    return this.passagesVisited[passage] || 0
  }

  either(...args) {
    // this lets it be called with an array
    if (args.length == 1 && Array.isArray(args[0]))
      args = args[0]

    const index = Math.floor(Math.random() * args.length)
    return args[index]
  }
}

// This is not the best way to do this, but for now, just create global functions that bridge for use in expressions via eval
function visited(passage) {
  return window.twee_engine ? window.twee_engine.visited(passage) : 0
}

function either(...args) {
  return window.twee_engine ? window.twee_engine.either(...args) : null
}
