import { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';

export default function MatlabEditor({ value, onChange, readOnly = false }) {
  const editorRef = useRef(null);

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;

    // Register MATLAB language if not already registered
    const languages = monaco.languages.getLanguages();
    if (!languages.find(lang => lang.id === 'matlab')) {
      monaco.languages.register({ id: 'matlab' });

      // Define MATLAB syntax highlighting
      monaco.languages.setMonarchTokensProvider('matlab', {
        keywords: [
          'break', 'case', 'catch', 'classdef', 'continue', 'else', 'elseif',
          'end', 'for', 'function', 'global', 'if', 'otherwise', 'parfor',
          'persistent', 'return', 'switch', 'try', 'while'
        ],
        builtins: [
          'sin', 'cos', 'tan', 'exp', 'log', 'sqrt', 'abs', 'max', 'min',
          'sum', 'mean', 'std', 'plot', 'figure', 'disp', 'fprintf', 'sprintf',
          'length', 'size', 'zeros', 'ones', 'eye', 'rand', 'randn'
        ],
        operators: [
          '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
          '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%',
          '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=',
          '%=', '<<=', '>>=', '>>>='
        ],
        symbols: /[=><!~?:&|+\-*\/\^%]+/,
        escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

        tokenizer: {
          root: [
            // Comments
            [/%.*$/, 'comment'],

            // Strings
            [/'([^'\\]|\\.)*$/, 'string.invalid'],
            [/'/, 'string', '@string'],

            // Keywords
            [/[a-z_$][\w$]*/, {
              cases: {
                '@keywords': 'keyword',
                '@builtins': 'predefined',
                '@default': 'identifier'
              }
            }],

            // Numbers
            [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
            [/\d+/, 'number'],

            // Operators
            [/@symbols/, {
              cases: {
                '@operators': 'operator',
                '@default': ''
              }
            }],

            // Whitespace
            [/[ \t\r\n]+/, 'white'],
          ],

          string: [
            [/[^\\']+/, 'string'],
            [/@escapes/, 'string.escape'],
            [/\\./, 'string.escape.invalid'],
            [/'/, 'string', '@pop']
          ],
        },
      });
    }
  }

  return (
    <Editor
      height="100%"
      defaultLanguage="matlab"
      value={value}
      onChange={onChange}
      onMount={handleEditorDidMount}
      theme="vs-light"
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        automaticLayout: true,
      }}
    />
  );
}
