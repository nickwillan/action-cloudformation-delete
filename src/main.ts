import * as core from '@actions/core'
import {
  CloudFormationClient,
  DeleteStackCommand,
  paginateDescribeStacks
} from '@aws-sdk/client-cloudformation'

interface StackTag {
  key: string
  value: string
}

async function run(): Promise<void> {
  try {
    const stackTags: StackTag[] = []

    const awsRegionInput: string = core.getInput('awsRegion').trim()
    const stackNamesInput: string = core.getInput('stackNames').trim()
    const stackTagsInput: string = core.getInput('stackTags').trim()

    if (!awsRegionInput) {
      core.setFailed('awsRegion is required')
      return
    }
    if (!stackNamesInput && !stackTagsInput) {
      core.setFailed('stackNames or stackTags is required')
      return
    }

    const client: CloudFormationClient = new CloudFormationClient({
      region: awsRegionInput
    })

    if (stackNamesInput) {
      await Promise.all(
        stackNamesInput.split(',').map(async stackName => {
          try {
            core.info(`Deleting Stack ${stackName} in ${awsRegionInput}...`)
            await client.send(
              new DeleteStackCommand({StackName: stackName.trim()})
            )
          } catch (error) {
            core.error(`Unable to delete ${stackName}`)
          }
        })
      )
    }

    if (stackTagsInput) {
      try {
        await Promise.all(
          stackTagsInput.split(',').map(async tagNameAndValue => {
            const splitTagArray = tagNameAndValue.trim().split('==', 2)
            stackTags.push({
              key: splitTagArray[0].trim(),
              value: splitTagArray[1].trim()
            })
          })
        )
      } catch (err: unknown) {
        core.setFailed(`Error parsing stackTags: ${err}`)
        return
      }

      if (stackTags.length > 0) {
        const stackNamesFromTags: string[] = []
        for await (const page of paginateDescribeStacks({client}, {})) {
          if (page.Stacks) {
            for (const stack of page.Stacks) {
              if (
                stackTags.every(stackTag =>
                  stack.Tags?.find(
                    obj =>
                      obj.Key === stackTag.key && obj.Value === stackTag.value
                  )
                )
              )
                stackNamesFromTags.push(stack.StackName as string)
            }
          }
        }

        await Promise.all(
          stackNamesFromTags.map(async stackName => {
            try {
              core.info(`Deleting Stack ${stackName} in ${awsRegionInput}...`)
              await client.send(new DeleteStackCommand({StackName: stackName}))
            } catch (error) {
              core.error(`Unable to delete ${stackName}`)
            }
          })
        )
      }
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
