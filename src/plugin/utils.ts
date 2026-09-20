export function assertIfTrueDev(expression: boolean, error_text: string){
    if(import.meta.env.DEV && expression){
        throw new Error(error_text)
    }
}