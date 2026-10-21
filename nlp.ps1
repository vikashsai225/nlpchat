param(
  [Parameter(ValueFromRemainingArguments = $true)]
  $Arguments
)

$script = Join-Path $PSScriptRoot "bin\nlp.js"
& node $script @Arguments
