
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

        case 'choice':
        result = { type: 'choice', choices: stmt.choices }
        this.awaitingChoice = true
        break

        case 'if':
        var clause = null  // TODO: check clauses
        if (clause) {
          this.nestedBlocks.push(this.currentBlock)
          this.nestedStatementIndices.push(this.statementIndex)
          this.currentBlock = clause.statements
          this.statementIndex = 0
        }
        break

        default:
        throw new Error('Unknown statement type: ' + stmt._type)
      }
    } else if (this.nestedStatementIndices.length > 0) {
      // finished previous block.  pop nested statement and keep going
      this.currentBlock = this.nestedBlocks.pop()
      this.statementIndex = this.nestedStatementIndices.pop()
      return interpretNextStatement()
    } else {
      throw new Error('No next statement')
    }

    return result
  }

  interpretExpression(expr) {
    return expr
  }
}
