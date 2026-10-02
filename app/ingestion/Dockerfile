# ============================================================================
#  IMAGE: LAMBDA · EMBEDDING · INGEST
#  --------------------------------------------------------------------------
#  This is the INGESTION WORKER image. In one glance:
#
#     Runs on  : AWS LAMBDA   (S3 upload trigger)
#     Job      : EMBED + INGEST documents into the vector index
#     Pipeline : load -> chunk -> Bedrock Titan EMBEDDING -> OpenSearch index
#     Entry    : app/ingestion/indexer.py -> lambda_handler
# ============================================================================

FROM public.ecr.aws/lambda/python:3.12

# LAMBDA_TASK_ROOT is /var/task, where Lambda looks for your code.
COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt

COPY app/ ${LAMBDA_TASK_ROOT}/app/

# module.path.to.function -- Lambda calls this on every invocation.
CMD ["app.ingestion.indexer.lambda_handler"]
