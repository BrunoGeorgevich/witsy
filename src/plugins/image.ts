
import { anyDict } from 'types/index.d'
import { store } from '../services/store'
import { saveFileContents } from '../services/download'
import { PluginParameter } from 'multi-llm-ts'
import Plugin, { PluginConfig } from './plugin'
import { HfInference } from '@huggingface/inference'
import OpenAI from 'openai'

export default class extends Plugin {

  constructor(config: PluginConfig) {
    super(config)
  }

  isEnabled(): boolean {
    return this.config?.enabled && (
      (this.config.engine == 'openai' && store.config?.engines.openai.apiKey != null) ||
      (this.config.engine == 'huggingface' && store.config?.engines.huggingface.apiKey != null)
    )
  }

  getName(): string {
    return 'image_generation'
  }

  getDescription(): string {
    return 'Generate an image based on a prompt. Returns the path of the image saved on disk and a description of the image. Always embed the image visible in the final response. Do not just include a link to the image.'
  }

  getPreparationDescription(): string {
    return this.getRunningDescription()
  }
      
  getRunningDescription(): string {
    return 'Painting pixels…'
  }

  getParameters(): PluginParameter[] {

    // every one has this
    const parameters: PluginParameter[] = [
      {
        name: 'prompt',
        type: 'string',
        description: 'The description of the image',
        required: true
      }
    ]

    // openai parameters
    if (this.config.engine == 'openai') {

      // rest depends on model
      if (store.config.engines.openai.model.image === 'dall-e-2') {

        parameters.push({
          name: 'size',
          type: 'string',
          enum: [ '256x256', '512x512', '1024x1024' ],
          description: 'The size of the image',
          required: false
        })

      } else if (store.config.engines.openai.model.image === 'dall-e-3') {

        parameters.push({
          name: 'quality',
          type: 'string',
          enum: [ 'standard', 'hd' ],
          description: 'The quality of the image',
          required: false
        })

        parameters.push({
          name: 'size',
          type: 'string',
          enum: [ '1024x1024', '1792x1024', '1024x1792' ],
          description: 'The size of the image',
          required: false
        })

        parameters.push({
          name: 'style',
          type: 'string',
          enum: ['vivid', 'natural'],
          description: 'The style of the image',
          required: false
        })

      }

    }

    // huggingface parameters
    if (this.config.engine == 'huggingface') {

      parameters.push({
        name: 'negative_prompt',
        type: 'string',
        description: 'Stuff to avoid in the generated image',
        required: false
      })

      parameters.push({
        name: 'width',
        type: 'number',
        description: 'The width of the image',
        required: false
      })

      parameters.push({
        name: 'height',
        type: 'number',
        description: 'The height of the image',
        required: false
      })

    }

    // done
    return parameters
  
  }

  async execute(parameters: anyDict): Promise<anyDict> {
    if (this.config.engine == 'openai') {
      return this.openai(parameters)
    } else if (this.config.engine == 'huggingface') {
      return this.huggingface(parameters)
    } else {
      throw new Error('Unsupported engine')
    }
  }

  async openai(parameters: anyDict): Promise<anyDict> {

    // init
    const client = new OpenAI({
      apiKey: store.config.engines.openai.apiKey,
      dangerouslyAllowBrowser: true
    })

    // call
    const model = store.config.engines.openai.model.image
    console.log(`[openai] prompting model ${model}`)
    const response = await client.images.generate({
      model: model,
      prompt: parameters?.prompt,
      response_format: 'b64_json',
      size: parameters?.size,
      style: parameters?.style,
      quality: parameters?.quality,
      n: parameters?.n || 1,
    })

    // save the content on disk
    const fileUrl = saveFileContents('png', response.data[0].b64_json)
    //console.log('[image] saved image to', fileUrl)

    // return an object
    return {
      path: fileUrl,
      description: parameters?.prompt,
    }

  }  

  async huggingface(parameters: anyDict): Promise<anyDict> {

    // init
    const client = new HfInference(store.config.engines.huggingface.apiKey)

    // call
    const model = store.config.engines.huggingface.model.image
    console.log(`[huggingface] prompting model ${model}`)
    const blob: Blob = await client.textToImage({
      model: model,
      inputs: parameters?.prompt,
      parameters: {
        negative_prompt: parameters?.negative_prompt,
        width: parameters?.width,
        height: parameters?.height
      }
    })

    // save the content on disk
    const b64 = await this.blobToBase64(blob)
    const type = blob.type?.split('/')[1] || 'jpg'
    const image = b64.split(',')[1]
    const fileUrl = saveFileContents(type, image)
    //console.log('[image] saved image to', fileUrl)

    // return an object
    return {
      path: fileUrl,
      description: parameters?.prompt
    }

  }  

  async blobToBase64(blob: Blob): Promise<string>{
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
  }
}