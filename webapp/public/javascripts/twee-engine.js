
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
    this.previousStatement = null
    this.previousPassageName = null
    this.gotoPassage(this.story.start)
  }

  makeChoice(choice) {
    if (!this.currentChoices) {
        throw new Error("Not awaiting a choice")
    }

    if (Number.isInteger(choice)) {
      var ch = this.currentChoices[choice]
      if (ch) {
        this.gotoPassage(ch.passage)
      } else {
        throw new Error("No choice available with index: " + choice)
      }
    } else {
      var ch = this.currentChoices.find(c => c.passage == choice)
      if (ch) {
        this.gotoPassage(ch.passage)
      } else {
        throw new Error("No choice available with passage named: " + choice)
      }
    }
  }

  gotoPassage(name) {
    this.currentPassageName = name
    this.currentLine = ""
    this.currentChoices = null
    this.nestedBlocks = []
    this.nestedStatementIndices = []
    this.nestedCallbacks = []
    this.statementIndex = -1

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

  previousPassage() {
    return this.passagesByName[this.previousPassageName]
  }

  nextStatement() {
    return this.currentBlock[this.statementIndex]
  }

  // returns one of:
  // { action: 'passage', passage: 'Start' }
  // { action: 'message', text: 'A line of text' }
  // { action: 'choice', choices: [{text: 'Choose this', passage: 'choice1'}, {text: 'Or this', passage: 'choice2'}] }
  // { action: 'delay', delay: '5m', seconds: 300, text: 'Taylor is busy' }
  // { action: 'prompt', text: 'Ready?' }
  // { action: 'rewind', passage: 'Start' }
  // { action: 'error', error: 'Undefined variable: $foo' }
  // { action: 'end' }
  getNextAction() {
    if (this.currentChoices) {
      throw new Error('Awaiting a choice.  Must choose with makeChoice')
    }

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
    // output passage action on passage boundary
    if (this.statementIndex < 0) {
      this.statementIndex = 0
      return { action: 'passage', passage: this.currentPassageName }
    }

    const stmt = this.nextStatement()
    if (stmt) {
      // keep track of previous statement and passage, for debugging
      this.previousStatement = stmt
      this.previousPassageName = this.currentPassageName

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
    // Note, do not output a passage action on includePassage, only on gotoPassage
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

    switch (stmt._type) {
      case 'newline':
      const message = this.currentLine.trim()
      this.currentLine = ""
      if (message) {
        return { action: 'message', text: message }
      }
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
      if (this.currentChoices) {
        this.currentChoices.push({ passage: stmt.passage, text: stmt.text || stmt.passage })
      } else {
        this.gotoPassage(passage)
      }
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
      if (this.currentLine) throw new Error('Did not emit newline before choice')
      this.currentChoices = []
      this.pushBlock(stmt.statements, () => {
        this.currentLine = ""
        return { action: 'choice', choices: this.currentChoices }
      })
      break

      case 'prompt':
      if (this.currentLine) throw new Error('Did not emit newline before prompt')
      this.pushBlock(stmt.statements, () => {
        const text = this.currentLine
        this.currentLine = ""
        return { action: 'prompt', text: text }
      })
      break

      case 'include':
      const incPassage = stmt.passage || this.interpretExpression(stmt.expression)
      this.includePassage(incPassage)
      break

      case 'rewind':
      const rewindPassage = stmt.passage || this.interpretExpression(stmt.expression)
      return { action: 'rewind', passage: rewindPassage }
      break

      case 'if':
      for (const clause of stmt.clauses) {
        // no condition means else clause
        const ok = !clause.condition || this.interpretExpression(clause.condition)
        if (ok) {
          this.pushBlock(clause.statements)
          break  // out of for loop
        }
      }
      break

      default:
      throw new Error('Unknown statement type: ' + stmt._type)
    }

    return null
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
