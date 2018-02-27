
class TweeEngine {

  constructor(story) {
    this.story = story

    this.passagesByName = {}
    story.passages.forEach(passage => {
      this.passagesByName[passage.name] = passage
    })

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
  // { type: 'message', text: 'A line of text' }
  // { type: 'choice', choices: [{title: 'Choose this', name: 'choice1'}, {title: 'Or this', name: 'choice2'}] }
  // { type: 'delay', seconds: 3600, text: 'Taylor is busy' }
  getNextAction() {
    while (true) {
      const result = this.interpretNextStatement()
      if (result) return result
    }
  }

  // return an action, or null to continue
  interpretNextStatement() {
    if (this.awaitingChoice) {
      throw new Error('Awaiting a choice.  Must make choice with gotoPassage')
    }

    var result = null
    const stmt = this.nextStatement()

    if (stmt) {
      // advance index within block.  some statements like 'if' or 'link' will alter this further.
      this.statementIndex += 1

      switch (stmt._type) {
        case 'newline':
        const message = this.currentLine.trim()
        if (message) {
          result = { type: 'message', text: message }
        }
        this.currentLine = ""
        break

        case 'text':
        this.currentLine += stmt.text
        break

        case 'set':
        this.variables[stmt.variable] = this.interpretExpression(stmt.expression)
        break

        case 'link':
        if (this.currentLine) throw new Error('Did not emit newline before link')
        this.gotoPassage(stmt.name)
        break

        case 'delay':
        const delayExpr = stmt.expression
        this.pushBlock(stmt.statements, () => {
          const text = this.currentLine
          this.currentLine = ""
          return { type: 'delay', delay: delayExpr, text: text }
        })
        break

        case 'choice':
        result = { type: 'choice', choices: stmt.choices }
        this.awaitingChoice = true
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
    } else if (this.isNestedBlock()) {
      // finished previous block.  pop nested statement.
      // if popped statement has a callback, call it and it may also produce a result.
      const popFn = this.popBlock()
      if (popFn) {
        result = popFn()
      }
    } else {
      throw new Error('No next statement')
    }

    return result
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

  interpretExpression(expr) {
    const keywords = ['true', 'false', 'null']

    const modifiedExpr = "'use strict'; " + expr
      .replace(/\bis\b/g, '==')
      .replace(/\bor\b/g, '||')
      .replace(/\band\b/g, '&&')
      .replace(/[$_a-zA-Z]\w*/g, (v) => {
        if (keywords.indexOf(v) >= 0) return v
        else return this.variables[v]
      })

    try {
      return eval(modifiedExpr)
    } catch (e) {
      console.log(modifiedExpr)
      throw new Error("Cannot evaluate expression: " + expr)
    }
  }
}
