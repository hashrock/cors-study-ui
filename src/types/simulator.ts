export type ExplanationMode = 'friendly' | 'strict' | 'scenario' | 'javascript' | 'charaboy'

export type Explanation = {
  message: string
  details: string
}

export type ExplanationSet = Record<ExplanationMode, Explanation>
