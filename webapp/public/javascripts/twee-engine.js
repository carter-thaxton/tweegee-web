
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
  // { action: 'delay', delay: '5m', text: 'Taylor is busy' }
  // { action: 'end' }
  getNextAction() {
    while (true) {
      const result = this.interpretNextStatement()
      if (result) {
        console.log(result)
        return result
      }
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
      this.gotoPassage(stmt.passage)
      break

      case 'delay':
      const delay = this.interpretExpression(stmt.expression)
      this.pushBlock(stmt.statements, () => {
        const text = this.currentLine || this.defaultDelayText
        this.currentLine = ""
        return { action: 'delay', delay: delay, text: text }
      })
      break

      case 'choice':
      result = { action: 'choice', choices: stmt.choices }
      this.awaitingChoice = true
      break

      case 'include':
      const includePassageName = stmt.passage
      const includePassage = this.passagesByName[includePassageName]
      const returnToPassage = this.currentPassageName
      if (includePassage) {
        this.currentPassageName = includePassageName
        this.pushBlock(includePassage.statements, () => {
          this.currentPassageName = returnToPassage
        })
      } else {
        throw new Error('Could not include passage named: ' + includePassageName)
      }
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
    const keywords = ['true', 'false', 'null']

    const modifiedExpr = "'use strict'; " + expr
      .replace(/\bor\b/g, '||')
      .replace(/\band\b/g, '&&')
      .replace(/\bis\b/g, '==')
      .replace(/\beq\b/g, '==')
      .replace(/\bne\b/g, '!=')
      .replace(/\bisnt\b/g, '!=')
      .replace(/\blt\b/g, '<')
      .replace(/\blte\b/g, '<=')
      .replace(/\bgt\b/g, '>')
      .replace(/\bgte\b/g, '>=')
      .replace(/("[^"]*"|'[^']*')|([$_a-zA-Z]\w*)/g, (match, quoted, variable) => {
        if (quoted) { return quoted }
        else if (variable) {
          if (keywords.indexOf(variable) >= 0) return variable
          return JSON.stringify(this.variables[variable])
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
}
