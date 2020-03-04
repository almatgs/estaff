function GetTapiLines()
{
	return CallServerMethod( this.Doc.Url, 'GetTapiLinesCore' );
}


"META:ALLOW-CALL-FROM-CLIENT:1";
function GetTapiLinesCore()
{
	tapiObject = new TapiObject;
	
	//providers = tapiObject.GetProviders();
}


