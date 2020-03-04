function GetTaskLastRunDate( taskID )
{
	return EvalCs( 'task_results.GetTaskLastRunDateCore( taskID )' );
}


function GetTaskLastRunDateCore( taskID )
{
	resultEntry = result_entries.GetOptChildByKey( taskID );
	if ( resultEntry == undefined )
		return null;

	return resultEntry.last_run_date;
}


function SetTaskLastRunDate( taskID, lastRunDate )
{
	return EvalCs( 'task_results.SetTaskLastRunDateCore( taskID, lastRunDate )' );
}


function SetTaskLastRunDateCore( taskID, lastRunDate )
{
	resultEntry = result_entries.ObtainChildByKey( taskID );
	resultEntry.last_run_date = lastRunDate;
	//result_entries.Doc.SetChanged( true );
	result_entries.Doc.Save();
}
