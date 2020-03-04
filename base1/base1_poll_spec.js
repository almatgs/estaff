function GetFreeAnswerID( question )
{
	for ( i = 1; ; i++ )
	{
		if ( ! question.answers.ChildByKeyExists( i ) )
			return i;
	}
}