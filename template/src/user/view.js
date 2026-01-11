import {Fynix, nixState, Path} from "fynix-core"

export default function UserPage({props}){
   const count = nixState(0);
  console.log("Props",props)
    return(
      <div>
        <h1>Hello from user page</h1>
        <h1>Count : {count}</h1>
        <button r-click={()=>count.value++} rc="p-2 bg-gray-100">ADD</button>
        <h2>{props}</h2>
        <Path to="/" value="Back to home"/>
      </div>
    )
}